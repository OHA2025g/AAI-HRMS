import {
  ORG_FILTER_ALL,
  normalizeOrgFilterValue,
  orgFilterChangeValue,
  orgFilterSelectValue,
  withSelectedOrgOption,
} from './dashboardOrgFilterUtils';

describe('dashboardOrgFilterUtils', () => {
  test('normalizeOrgFilterValue treats sentinel as empty', () => {
    expect(normalizeOrgFilterValue(ORG_FILTER_ALL)).toBe('');
    expect(normalizeOrgFilterValue('  Core Business  ')).toBe('Core Business');
  });

  test('withSelectedOrgOption preserves active URL value', () => {
    expect(withSelectedOrgOption(['Finance'], 'Operations')).toEqual(['Operations', 'Finance']);
    expect(withSelectedOrgOption(['Finance'], '')).toEqual(['Finance']);
  });

  test('orgFilterSelectValue maps empty to sentinel', () => {
    expect(orgFilterSelectValue('')).toBe(ORG_FILTER_ALL);
    expect(orgFilterSelectValue('HR')).toBe('HR');
  });

  test('orgFilterChangeValue normalizes sentinel from select', () => {
    expect(orgFilterChangeValue(ORG_FILTER_ALL)).toBe('');
    expect(orgFilterChangeValue('Sales')).toBe('Sales');
  });
});
