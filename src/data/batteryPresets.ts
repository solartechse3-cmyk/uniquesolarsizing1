import { BatteryPreset } from '../types';

export const DEFAULT_BATTERY_PRESETS: BatteryPreset[] = [
  {
    id: 'bat_dyness_bx51100',
    brand: 'Dyness',
    model: 'BX51100 (5.12 kWh / 100Ah)',
    voltage: 51.2,
    capacityAh: 100,
    energyKwh: 5.12,
    chemistry: 'lifepo4',
    maxDischargeC: 0.5,
    dodPercent: 90
  },
  {
    id: 'bat_deye_seg51_pro',
    brand: 'Deye',
    model: 'SE-G5.1 Pro (5.12 kWh / 100Ah)',
    voltage: 51.2,
    capacityAh: 100,
    energyKwh: 5.12,
    chemistry: 'lifepo4',
    maxDischargeC: 1.0,
    dodPercent: 90
  },
  {
    id: 'bat_pylontech_us5000',
    brand: 'Pylontech',
    model: 'US5000 (4.8 kWh / 100Ah)',
    voltage: 48,
    capacityAh: 100,
    energyKwh: 4.80,
    chemistry: 'lifepo4',
    maxDischargeC: 1.0,
    dodPercent: 95
  },
  {
    id: 'bat_pylontech_us3000c',
    brand: 'Pylontech',
    model: 'US3000C (3.55 kWh / 74Ah)',
    voltage: 48,
    capacityAh: 74,
    energyKwh: 3.55,
    chemistry: 'lifepo4',
    maxDischargeC: 0.7,
    dodPercent: 95
  },
  {
    id: 'bat_felicity_lpbf48200',
    brand: 'Felicity Solar',
    model: 'LPBF48200 (10.0 kWh / 200Ah Powerwall)',
    voltage: 51.2,
    capacityAh: 200,
    energyKwh: 10.0,
    chemistry: 'lifepo4',
    maxDischargeC: 0.5,
    dodPercent: 90
  },
  {
    id: 'bat_felicity_lpbf48100',
    brand: 'Felicity Solar',
    model: 'LPBF48100-M (5.0 kWh / 100Ah)',
    voltage: 51.2,
    capacityAh: 100,
    energyKwh: 5.0,
    chemistry: 'lifepo4',
    maxDischargeC: 0.5,
    dodPercent: 90
  },
  {
    id: 'bat_shoto_sda10',
    brand: 'Shoto',
    model: 'SDA10-48100 (4.8 kWh / 100Ah Telecom/Solar)',
    voltage: 48,
    capacityAh: 100,
    energyKwh: 4.80,
    chemistry: 'lifepo4',
    maxDischargeC: 0.5,
    dodPercent: 90
  },
  {
    id: 'bat_narada_48npfc',
    brand: 'Narada',
    model: '48NPFC100 (4.8 kWh / 100Ah)',
    voltage: 48,
    capacityAh: 100,
    energyKwh: 4.80,
    chemistry: 'lifepo4',
    maxDischargeC: 0.5,
    dodPercent: 90
  },
  {
    id: 'bat_growatt_hope',
    brand: 'Growatt',
    model: 'AXE 5.0L (5.0 kWh / 100Ah Modular)',
    voltage: 51.2,
    capacityAh: 100,
    energyKwh: 5.0,
    chemistry: 'lifepo4',
    maxDischargeC: 0.5,
    dodPercent: 90
  },
  {
    id: 'bat_byd_lv_flex',
    brand: 'BYD',
    model: 'Battery-Box LV Flex (5.0 kWh)',
    voltage: 51.2,
    capacityAh: 100,
    energyKwh: 5.0,
    chemistry: 'lifepo4',
    maxDischargeC: 1.0,
    dodPercent: 95
  },
  {
    id: 'bat_sunwoda_athena',
    brand: 'Sunwoda',
    model: 'Atrix 5.0 kWh (100Ah @ 51.2V)',
    voltage: 51.2,
    capacityAh: 100,
    energyKwh: 5.12,
    chemistry: 'lifepo4',
    maxDischargeC: 0.5,
    dodPercent: 90
  },
  {
    id: 'bat_deepcycle_gel_200ah',
    brand: 'Standard Deep Cycle',
    model: '12V 200Ah Lead Carbon / Gel (2.4 kWh)',
    voltage: 12,
    capacityAh: 200,
    energyKwh: 2.40,
    chemistry: 'gel_lead_acid',
    maxDischargeC: 0.2,
    dodPercent: 50
  }
];
