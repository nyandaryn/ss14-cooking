import {
  createContext,
  Dispatch,
  ReactElement,
  ReactNode,
  Ref,
  RefCallback,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState
} from 'react';
import { createPortal } from 'react-dom';

const PopupStackContext = createContext<readonly PopupId[]>([]);

export interface PopupTrigger<ETrigger extends TriggerElement> {
  id: PopupId;
  open: boolean;
  triggerRef: Ref<ETrigger>;
}

export type PopupId = string & {
  [PopupIdSymbol]: unknown;
};

export interface PopupTriggerOptions {
  intentTimeout?: number;
  closeDelay?: number;
}

declare const PopupIdSymbol: unique symbol;

export function usePopupTrigger<
  ETrigger extends TriggerElement = HTMLElement
>(
  {
    intentTimeout = 500,
    closeDelay = 300,
  }: PopupTriggerOptions = {}
): PopupTrigger<ETrigger> {
  const parents = useContext(PopupStackContext);
  const id = useId() as PopupId;

  const [open, setOpen] = useState(false);

  const inst = useMemo<PopupInstance>(() => ({
    id,
    trigger: null,
    intentTimeout: 0,
    closeDelay,
    open: false,
    setOpen,
    stack: parents.concat(id),
  }), []);
  inst.intentTimeout = intentTimeout;
  inst.closeDelay = closeDelay;
  inst.open = open;

  useEffect(() => {
    register(inst);
    return () => unregister(inst);
  }, [inst]);

  const triggerRef = useCallback<RefCallback<ETrigger>>(ref => {
    inst.trigger = ref;
    if (ref) {
      idsByElement.set(ref, id);
      return () => void idsByElement.delete(ref);
    }
  }, [inst]);

  return { id, open, triggerRef };
}

export interface PopupProps {
  id: PopupId;
  open?: boolean;
  placement?: PopupPlacement;
  interactive?: boolean;
  children?: ReactNode;
}

export type PopupPlacement =
  | 'above'
  | 'below'
  | 'left'
  | 'right';

export const Popup = ({
  id,
  open,
  placement = 'above',
  interactive = false,
  children,
}: PopupProps): ReactElement | null => {
  const parentStack = useContext(PopupStackContext);

  const ownStack = useMemo(() => parentStack.concat(id), [parentStack]);

  const [popup, setPopup] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (popup) {
      idsByElement.set(popup, id);
      return () => void idsByElement.delete(popup);
    }
  }, [popup]);

  useEffect(() => {
    const trigger = instances.get(id)?.trigger;
    if (!open || !popup || !trigger) {
      return;
    }

    const [x, y] = placePopup(
      placement,
      trigger.getBoundingClientRect(),
      popup.getBoundingClientRect()
    );

    popup.style.left = `${Math.round(x)}px`;
    popup.style.top = `${Math.round(y)}px`;
  }, [open, popup, placement, children]);

  if (!open) {
    return null;
  }

  return createPortal(
    <PopupStackContext value={ownStack}>
      <div
        className={
          `popup popup--${placement} ${interactive ? 'popup--interactive' : ''}`
        }
        ref={setPopup}
      >
        {children}
      </div>
    </PopupStackContext>,
    getPopupRoot()
  );
};

type TriggerElement = HTMLElement | SVGElement;

interface PopupInstance {
  readonly id: PopupId;
  trigger: TriggerElement | null;
  intentTimeout: number;
  closeDelay: number;
  open: boolean;
  readonly setOpen: Dispatch<SetStateAction<boolean>>;
  /**
   * The stack of popup IDs that lead to this popup, including the popup itself.
   * When this array has a length greater than 1, it means the trigger is inside
   * the contents of another (interactive) popup. Index 0 is the root popup.
   *
   * When moving between popups, we use the stack to determine the appropriate
   * transition, for example:
   *
   *     [A, B]    -> [A, B, C] -- open C, leave A and B alone
   *     [A, B, C] -> [A, B]    -- close C
   *     [A, B, C] -> [A, B, D] -- close C, open D
   *     [A, B, C] -> [A, E]    -- close B and C, open E
   *     [A, B]    -> [F]       -- close A and B, open F
   */
  readonly stack: readonly PopupId[];
}

let currentPopup: PopupInstance | null = null;
let popupTimeoutId: number | null = null;
let hoverTimeoutId: number | null = null;
let pendingHoverTarget: PopupId | undefined;

const cancelHoverTransition = (): void => {
  if (hoverTimeoutId !== null) window.clearTimeout(hoverTimeoutId);
  hoverTimeoutId = null;
  pendingHoverTarget = undefined;
};
const instances = new Map<PopupId, PopupInstance>();
const idsByElement = new Map<TriggerElement, PopupId>();

const moveTo = (nextId: PopupId | undefined): void => {
  cancelHoverTransition();
  const prev = currentPopup;
  const next = instances.get(nextId!) ?? null;
  if (next === prev) {
    // Nothing to do.
    return;
  }

  let lastCommonIndex = -1;
  if (prev) {
    for (let i = 0; i < prev.stack.length; i++) {
      const prevId = prev.stack[i];
      const nextId = next?.stack[i] ?? null;
      if (prevId === nextId) {
        lastCommonIndex = i;
      } else {
        instances.get(prevId)?.setOpen(false);
      }
    }
  }

  const shouldCancelPrevTimeout =
    // Every popup is being closed, or...
    !next ||
    // We have to open something new.
    lastCommonIndex < next.stack.length;
  if (shouldCancelPrevTimeout && popupTimeoutId != null) {
    window.clearTimeout(popupTimeoutId);
    popupTimeoutId = null;
  }
  if (next && lastCommonIndex < next.stack.length) {
    // Each new trigger must be hovered deliberately, including nested popups.
    // Crossing a recently closed trigger must not bypass the opening delay.
    popupTimeoutId = window.setTimeout(() => {
      for (let i = lastCommonIndex + 1; i < next.stack.length; i++) {
        const nextId = next.stack[i];
        instances.get(nextId)?.setOpen(true);
      }
      popupTimeoutId = null;
    }, next.intentTimeout);
  }

  currentPopup = next;
};

// A portal's contents belong to its popup, including focusable descendants.
// Resolve both pointer and focus targets through the same ancestor chain.
const popupForTarget = (target: EventTarget | null): PopupId | undefined => {
  let node = target instanceof Element ? target : null;
  while (node) {
    const id = idsByElement.get(node as TriggerElement);
    if (id) return id;
    node = node.parentElement;
  }
  return undefined;
};

const mouseMove = (e: MouseEvent): void => {
  const id = popupForTarget(e.target);
  const next = id ? instances.get(id) : undefined;
  // Returning to the same panel or entering a descendant cancels its closure.
  if (!currentPopup?.open || next?.stack.includes(currentPopup.id)) {
    moveTo(id);
    return;
  }
  // Do not restart the grace period for every pixel moved through the gap.
  if (hoverTimeoutId !== null && pendingHoverTarget === id) return;
  cancelHoverTransition();
  pendingHoverTarget = id;
  hoverTimeoutId = window.setTimeout(() => moveTo(id), currentPopup.closeDelay);
};

const focus = (e: FocusEvent): void => {
  moveTo(popupForTarget(e.target));
};

const blur = (e: FocusEvent): void => {
  // A link receiving focus inside a portal must survive until its click fires.
  const next = popupForTarget(e.relatedTarget);
  if (next) moveTo(next);
  else if (e.relatedTarget) moveTo(undefined);
};

const keyDown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape') moveTo(undefined);
};

const closeAll = () => moveTo(undefined);

const register = (inst: PopupInstance): void => {
  if (instances.size === 0) {
    window.addEventListener('mousemove', mouseMove, { passive: true });
    window.addEventListener('focusin', focus);
    window.addEventListener('focusout', blur);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('scroll', closeAll, { passive: true });
  }
  instances.set(inst.id, inst);
};

const unregister = (inst: PopupInstance): void => {
  if (currentPopup?.stack.includes(inst.id)) {
    moveTo(undefined);
  }
  instances.delete(inst.id);
  if (instances.size === 0) {
    window.removeEventListener('mousemove', mouseMove);
    window.removeEventListener('focusin', focus);
    window.removeEventListener('focusout', blur);
    window.removeEventListener('keydown', keyDown);
    cancelHoverTransition();
    window.removeEventListener('scroll', closeAll);
  }
};

/**
 * Places a popup relative to a parent element.
 * @param placement The relative location of the popup.
 * @param parentRect The parent element's location on screen.
 * @param popupRect The popup element's location on screen.
 * @param separation The distance between the popup element and the edge of
 *        the parent element.
 * @param screenMargin The minimum distance between the popup element and
 *        the edge of the screen.
 * @return The location of the popup's top left corner.
 */
function placePopup(
  placement: PopupPlacement,
  parentRect: DOMRect,
  popupRect: DOMRect,
  screenMargin = 8
): [number, number] {
  let x: number;
  switch (placement) {
    case 'above':
    case 'below':
      x = parentRect.x + (parentRect.width - popupRect.width) / 2;
      break;
    case 'left':
      x = parentRect.x - popupRect.width;
      break;
    case 'right':
      x = parentRect.x + parentRect.width;
      break;
  }
  x = clamp(
    x,
    screenMargin,
    window.innerWidth - popupRect.width - screenMargin
  );

  let y: number;
  switch (placement) {
    case 'above':
      y = parentRect.y - popupRect.height;
      break;
    case 'below':
      y = parentRect.y + parentRect.height;
      break;
    case 'left':
    case 'right':
      y = parentRect.y + (parentRect.height - popupRect.height) / 2;
      break;
  }
  y = clamp(
    y,
    screenMargin,
    window.innerHeight - popupRect.height - screenMargin
  );

  return [x, y];
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

let root: HTMLElement | null = null;

export function getPopupRoot(): HTMLElement {
  if (!root) {
    root = document.createElement('div');
    root.dataset.purpose = 'popups';
    document.body.appendChild(root);
  }
  return root;
}
