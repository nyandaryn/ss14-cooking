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
  useLayoutEffect,
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

  useLayoutEffect(() => {
    const trigger = instances.get(id)?.trigger;
    if (!open || !popup || !trigger) return;

    const position = () => {
      const layout = placePopup(
        placement,
        trigger.getBoundingClientRect(),
        popup.getBoundingClientRect(),
        interactive,
        trigger.closest('.popup')?.getBoundingClientRect()
      );
      popup.style.left = `${Math.round(layout.x)}px`;
      popup.style.top = `${Math.round(layout.y)}px`;
      popup.style.setProperty('--popup-available-height', `${layout.maxHeight}px`);
    };
    position();
    // Content can grow when sources load or a details section is expanded.
    const observer = new ResizeObserver(position);
    observer.observe(popup);
    window.addEventListener('resize', position);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
    };
  }, [open, popup, placement, interactive, children]);

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
let pointerPosition: { x: number; y: number } | null = null;
let openedAtPointer: { x: number; y: number } | null = null;

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

  // Changing targets also cancels a pending child when returning to its parent.
  if (popupTimeoutId != null) {
    window.clearTimeout(popupTimeoutId);
    popupTimeoutId = null;
  }
  if (next && lastCommonIndex < next.stack.length - 1) {
    // Each new trigger must be hovered deliberately, including nested popups.
    // Crossing a recently closed trigger must not bypass the opening delay.
    popupTimeoutId = window.setTimeout(() => {
      openedAtPointer = pointerPosition;
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
  pointerPosition = { x: e.clientX, y: e.clientY };
  let id = popupForTarget(e.target);
  let next = id ? instances.get(id) : undefined;
  // A newly mounted panel (or scrolled list) must not activate a link that
  // happens to appear under the pointer. Small mouse jitter is not intent.
  if (next && !next.open && next.stack.length > 1 && openedAtPointer &&
    Math.hypot(e.clientX - openedAtPointer.x, e.clientY - openedAtPointer.y) < 10) {
    id = next.stack.slice(0, -1).reverse().find(id => instances.get(id)?.open);
    next = id ? instances.get(id) : undefined;
  }
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

const scroll = (e: Event): void => {
  const panel = e.target instanceof Element ? e.target.closest('.popup') : null;
  if (panel) {
    // Keep the scrolled panel, but cancel pending previews for moving rows.
    moveTo(popupForTarget(panel));
    openedAtPointer = pointerPosition;
  } else {
    closeAll();
  }
};

const register = (inst: PopupInstance): void => {
  if (instances.size === 0) {
    window.addEventListener('mousemove', mouseMove, { passive: true });
    window.addEventListener('focusin', focus);
    window.addEventListener('focusout', blur);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('scroll', scroll, { passive: true, capture: true });
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
    window.removeEventListener('scroll', scroll, true);
  }
};

/** Keep the trigger uncovered, even when a long preview needs to scroll. */
function placePopup(
  placement: PopupPlacement,
  trigger: DOMRect,
  popup: DOMRect,
  interactive = false,
  parentPanel?: DOMRect,
  margin = 8,
  gap = 8
): { x: number; y: number; maxHeight: number } {
  const viewportHeight = Math.max(0, window.innerHeight - margin * 2);
  const fitX = (x: number) => clamp(x, margin, window.innerWidth - popup.width - margin);
  const fitY = (y: number) => clamp(y, margin, window.innerHeight - Math.min(popup.height, viewportHeight) - margin);
  const space = {
    right: window.innerWidth - trigger.right - gap - margin,
    left: trigger.left - gap - margin,
    below: Math.max(0, window.innerHeight - trigger.bottom - gap - margin),
    above: Math.max(0, trigger.top - gap - margin),
  };

  // Cascading previews sit alongside their parent panel when possible, so its
  // ingredient list stays readable. Otherwise anchor beside the actual link.
  if (interactive) {
    for (const anchor of parentPanel ? [parentPanel, trigger] : [trigger]) {
      for (const side of ['right', 'left'] as const) {
        const available = side === 'right'
          ? window.innerWidth - anchor.right - gap - margin
          : anchor.left - gap - margin;
        if (available >= popup.width) return {
          x: side === 'right' ? anchor.right + gap : anchor.left - gap - popup.width,
          y: fitY(trigger.top),
          maxHeight: viewportHeight,
        };
      }
    }
  } else if (placement === 'left' || placement === 'right') {
    if (space[placement] >= popup.width) return {
      x: placement === 'right' ? trigger.right + gap : trigger.left - gap - popup.width,
      y: fitY(trigger.top + (trigger.height - popup.height) / 2),
      maxHeight: viewportHeight,
    };
  }

  // On narrow screens choose the larger vertical space and constrain the
  // panel to it instead of clamping a full-height panel over the hovered link.
  const preferred = placement === 'above' ? 'above' : 'below';
  const opposite = preferred === 'above' ? 'below' : 'above';
  const side = space[preferred] >= popup.height ? preferred
    : space[opposite] >= popup.height ? opposite
    : space.above > space.below ? 'above' : 'below';
  const maxHeight = space[side];
  return {
    x: fitX(trigger.left + (trigger.width - popup.width) / 2),
    y: side === 'below' ? trigger.bottom + gap
      : trigger.top - gap - Math.min(popup.height, maxHeight),
    maxHeight,
  };
}

function clamp(value: number, min: number, max: number): number {
  max = Math.max(min, max);
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
