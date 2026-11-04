import { KeyboardEvent, ReactElement, useCallback, useMemo } from 'react';
import { FocusTrap } from '../focus';
import { Lang, LangNames, Languages, useLang } from '../i18n';
import { TemperatureUnitSetting, ThemeSetting, useSettings } from './context';
import { Option, OptionGroup } from './option-group';

export interface SettingsDialogProps {
  onClose: () => void;
}

export const SettingsDialog = ({
  onClose,
}: SettingsDialogProps): ReactElement => {
  const [settings, update] = useSettings();
  const { lang, setLang, t } = useLang();

  const languageOptions = useMemo<readonly Option<Lang>[]>(() =>
    Languages.map(l => ({ name: LangNames[l], value: l })),
  []);

  const themeOptions = useMemo<readonly Option<ThemeSetting>[]>(() => [
    { name: t.common.settings.themeDark, value: 'dark' },
    { name: t.common.settings.themeLight, value: 'light' },
  ], [t]);

  const temperatureUnitOptions = useMemo<
    readonly Option<TemperatureUnitSetting>[]
  >(() => [
    { name: t.common.settings.kelvin, value: 'kelvin' },
    { name: t.common.settings.celsius, value: 'celsius' },
    { name: t.common.settings.fahrenheit, value: 'fahrenheit' },
  ], [t]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      e.key === 'Escape' &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      onClose();
    }
  }, [onClose]);

  const handleChangeTheme = useCallback((value: ThemeSetting) => {
    update(draft => {
      draft.theme = value;
    });
  }, [update]);

  const handleChangeTemperatureUnit = useCallback((
    value: TemperatureUnitSetting
  ) => {
    update(draft => {
      draft.temperatureUnit = value;
    });
  }, [update]);

  return (
    <FocusTrap onPointerDownOutside={onClose}>
      <div className='settings' tabIndex={-1} onKeyDown={handleKeyDown}>
        <div className='settings_name'>
          {t.common.language.label}
        </div>
        <OptionGroup
          options={languageOptions}
          value={lang}
          onChange={setLang}
        />

        <div className='settings_name'>
          {t.common.settings.colorScheme}
        </div>
        <OptionGroup
          options={themeOptions}
          value={settings.theme}
          onChange={handleChangeTheme}
        />

        <div className='settings_name'>
          {t.common.settings.temperatureUnit}
        </div>
        <OptionGroup
          options={temperatureUnitOptions}
          value={settings.temperatureUnit}
          onChange={handleChangeTemperatureUnit}
        />
      </div>
    </FocusTrap>
  );
};
