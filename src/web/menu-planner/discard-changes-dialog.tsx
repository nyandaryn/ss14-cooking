import { KeyboardEvent, ReactElement, useCallback } from 'react';
import { FocusTrap } from '../focus';
import { useT } from '../i18n';
import { Overlay } from '../overlay';

export interface Props {
  onStay: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

export const DiscardChangesDialog = ({
  onStay,
  onSave,
  onDiscard,
}: Props): ReactElement => {
  const t = useT();
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onStay();
    }
  }, [onStay]);

  return (
    <Overlay>
      <FocusTrap onPointerDownOutside={onStay}>
        <div
          className='dialog dialog--basic'
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <h2>{t.menu.discardDialog.title}</h2>
          <div className='dialog_body thin-scroll'>
            {t.menu.discardDialog.body}
          </div>
          <div className='dialog_actions'>
            <button onClick={onStay}>
              {t.menu.discardDialog.stay}
            </button>
            <span className='spacer'/>
            <button onClick={onSave}>
              {t.menu.discardDialog.save}
            </button>
            <button onClick={onDiscard}>
              {t.menu.discardDialog.discard}
            </button>
          </div>
        </div>
      </FocusTrap>
    </Overlay>
  );
};
