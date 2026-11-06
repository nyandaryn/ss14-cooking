type Data = Record<string, unknown>;
const labels: Record<string, string> = {
  Blunt: 'Ушибы', Slash: 'Порезы', Piercing: 'Уколы', Brute: 'Механический урон', Burn: 'Термический урон', Heat: 'Тепловой урон', Cold: 'Холод', Shock: 'Электрический урон', Caustic: 'Кислотный урон', Poison: 'Яды', Radiation: 'Радиация', Asphyxiation: 'Удушье', Airloss: 'Кислородное голодание', Bloodloss: 'Кровопотеря', Cellular: 'Клеточный урон', Mangleness: 'Повреждение тканей',
  ModifyBleed: 'Изменение кровотечения', ModifyBloodLevel: 'Изменение уровня крови', EyeDamage: 'Повреждение глаз', Jitter: 'Дрожь', Vomit: 'Рвота', Drunk: 'Опьянение', Extinguish: 'Тушение огня', Ignite: 'Воспламенение', Flammable: 'Горючесть', CureZombieInfection: 'Лечение зомби-инфекции', ReduceRotting: 'Замедление гниения', MakeSentient: 'Развитие разума', ResetNarcolepsy: 'Сброс нарколепсии', Satiate: 'Насыщение', MovementSpeedModifier: 'Изменение скорости', Electrocute: 'Удар током', DeconvertCultist: 'Снятие влияния культа', ModifyKnockdown: 'Изменение времени падения', Emote: 'Эмоция', PopupMessage: 'Сообщение',
  amount: 'количество', time: 'время (с)', duration: 'длительность (с)', min: 'минимум', max: 'максимум', type: 'действие', key: 'статус', effectProto: 'эффект', walkSpeedModifier: 'скорость ходьбы', sprintSpeedModifier: 'скорость бега', refresh: 'обновление', conditions: 'условия', inverted: 'инверсия',
  Muted: 'Немота', ForcedSleeping: 'Принудительный сон', SeeingRainbow: 'Радужное зрение', PressureImmunity: 'Защита от давления', Stutter: 'Заикание', Paralyzed: 'Паралич', Adrenaline: 'Адреналин', Drowsiness: 'Сонливость', StimulantsStamina: 'Стимуляция выносливости', PainNumbness: 'Подавление боли', Stunned: 'Оглушение', Hemorrhage: 'Кровотечение', DesoxyStamina: 'Стимуляция выносливости дезоксиэфедрином', Pacified: 'Умиротворение', Blindness: 'Слепота', NightVision: 'Ночное зрение', Scrambled: 'Спутанность восприятия', Woozy: 'Головокружение', RadiationProtection: 'Защита от радиации', Anticoagulant: 'Антикоагуляция', Frail: 'Хрупкость', satiationType: 'тип насыщения', Thirst: 'Жажда', Hunger: 'Голод', Nutrition: 'Питание', factor: 'множитель', seconds: 'секунды', electrocuteTime: 'длительность удара током (с)',
  Critical: 'Критическое состояние', Alive: 'Жив', Dead: 'Мёртв', Add: 'Добавить', Remove: 'Убрать', Update: 'Обновить', Set: 'Установить',
};
export function describeEffect(effect: Data, ru: boolean, reagentName: (id: string) => string = id => id): string {
  const label = (v: unknown): string => { const name = String(v).replace(/^StatusEffect/, ''); return ru ? labels[name] ?? name : name.replace(/([a-z])([A-Z])/g, '$1 $2'); };
  const value = (v: unknown): string => Array.isArray(v) ? v.map(value).join(', ') : v && typeof v === 'object' ? Object.entries(v).map(([k, v]) => `${label(k)}: ${value(v)}`).join('; ') : label(v);
  const type = String(effect['!type'] ?? 'Effect');
  let result: string;
  if (['HealthChange', 'EvenHealthChange', 'DistributedHealthChange'].includes(type)) {
    const damage = (effect.damage ?? {}) as Data;
    const entries = type === 'EvenHealthChange' ? Object.entries(damage) : [...Object.entries((damage.types ?? {}) as Data), ...Object.entries((damage.groups ?? {}) as Data)];
    result = entries.filter(([, n]) => Number(n) !== 0).map(([kind, n]) => `${Number(n) < 0 ? (ru ? 'Лечит' : 'Heals') : (ru ? 'Наносит' : 'Deals')} ${Math.abs(Number(n))} — ${label(kind)}`).join('; ');
    if (type === 'EvenHealthChange' || damage.groups) result += ru ? ' (суммарно по группе, распределяется между типами)' : ' (total for the group, distributed across damage types)';
  } else if (type === 'ModifyBleed' || type === 'ModifyBloodLevel') {
    const amount = Number(effect.amount);
    result = `${amount < 0 ? (ru ? 'Уменьшает' : 'Decreases') : (ru ? 'Увеличивает' : 'Increases')} ${type === 'ModifyBleed' ? (ru ? 'кровотечение' : 'bleeding') : (ru ? 'уровень крови' : 'blood level')} ${ru ? 'на' : 'by'} ${Math.abs(amount)}`;
  } else if (type === 'AdjustReagent') {
    result = `${Number(effect.amount) < 0 ? (ru ? 'Выводит' : 'Removes') : (ru ? 'Добавляет' : 'Adds')} ${Math.abs(Number(effect.amount))} u ${reagentName(String(effect.reagent))}`;
  } else if (type === 'AdjustTemperature') {
    result = `${ru ? 'Изменение тепловой энергии' : 'Heat energy change'}: ${effect.amount} J`;
  } else if (type === 'ModifyStatusEffect' || type === 'GenericStatusEffect') {
    result = `${ru ? 'Статус' : 'Status'}: ${label(effect.effectProto ?? effect.key)}; ${label(effect.type ?? 'Update')}, ${effect.time === null ? (ru ? 'без ограничения времени' : 'indefinite') : `${effect.time ?? 2} ${ru ? 'с' : 's'}`}${effect.delay != null ? `; ${ru ? 'задержка' : 'delay'}: ${effect.delay} s` : ''}`;
  } else {
    const fields = Object.entries(effect).filter(([k]) => !['!type', 'conditions', 'probability'].includes(k));
    result = `${label(type)}${fields.length ? ': ' + fields.map(([k, v]) => `${label(k)}: ${value(v)}`).join('; ') : ''}`;
  }
  const conditions = (effect.conditions ?? []) as Data[];
  if (conditions.length) result += ` — ${ru ? 'при' : 'when'} ` + conditions.map(c => {
    const bounds = (unit: string) => [c.min != null ? `≥ ${c.min} ${unit}` : '', c.max != null ? `≤ ${c.max} ${unit}` : ''].filter(Boolean).join(', ');
    let text = c['!type'] === 'ReagentCondition' ? `${reagentName(String(c.reagent))}: ${bounds('u')}`
      : c['!type'] === 'TemperatureCondition' ? `${ru ? 'температура тела' : 'body temperature'} ${bounds('K')}`
      : c['!type'] === 'MobStateCondition' ? value(c.mobstate ?? c.mobState ?? c)
      : value(c);
    if (c.inverted) text = `${ru ? 'НЕ' : 'NOT'} (${text})`;
    return text;
  }).join(ru ? ' И ' : ' AND ');
  if (effect.probability != null && Number(effect.probability) !== 1) result += ` (${ru ? 'вероятность' : 'chance'} ${Number((Number(effect.probability) * 100).toFixed(4))}%)`;
  return result;
}

/** Split mixed healing/harm into individually styled rows without losing conditions. */
export function effectRows(effect: Data, reagentId: string, ru: boolean, name: (id: string) => string) {
  const type = String(effect['!type']);
  const damage = (effect.damage ?? {}) as Data;
  const health = ['HealthChange', 'EvenHealthChange', 'DistributedHealthChange'].includes(type);
  const parts: Data[] = health
    ? (type === 'EvenHealthChange'
      ? Object.entries(damage).map(([key, amount]) => ({ ...effect, damage: { [key]: amount } }))
      : ['types', 'groups'].flatMap(group => Object.entries((damage[group] ?? {}) as Data).map(([key, amount]) => ({ ...effect, damage: { [group]: { [key]: amount } } }))))
    : [effect];
  return parts.flatMap(part => {
    const d = (part.damage ?? {}) as Data;
    const amount = health ? Number(Object.values(type === 'EvenHealthChange' ? d : (d.types ?? d.groups ?? {}) as Data)[0]) : Number(part.amount);
    if (health && (!Number.isFinite(amount) || amount === 0)) return [];
    const harmful = health ? amount > 0 : ['Vomit', 'Jitter', 'Drunk', 'Ignite', 'Electrocute'].includes(type) || (type === 'ModifyBleed' && amount > 0) || (type === 'ModifyBloodLevel' && amount < 0);
    const healing = (health && amount < 0) || (type === 'ModifyBleed' && amount < 0) || (type === 'ModifyBloodLevel' && amount > 0);
    const tone = harmful ? 'harm' : healing ? 'heal' : 'neutral';
    const icon = health ? (healing ? 'heal' : 'harm') : ['ModifyBleed', 'ModifyBloodLevel'].includes(type) ? 'blood' : type === 'AdjustTemperature' ? 'temperature' : harmful ? 'harm' : 'status';
    const overdose = harmful && ((part.conditions ?? []) as Data[]).some(c => c['!type'] === 'ReagentCondition' && c.reagent === reagentId && Number(c.min) > 0 && !c.inverted);
    const text = describeEffect({ ...part, conditions: [], probability: 1 }, ru, name);
    const conditions = describeEffect(part, ru, name).slice(text.length).replace(/^ — /, '').trim();
    return [{ text, conditions, tone, icon, overdose }];
  });
}
