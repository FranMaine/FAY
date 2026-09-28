import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiError } from '@google/genai';
import { conReintentos, errorDeGemini } from '../ia';

const cuota = (quotaId: string, retry: string) =>
  new ApiError({ status: 429, message: `{"error":{"message":"retry in ${retry}s","details":[{"quotaId":"${quotaId}"}]}}` });

describe('conReintentos - cuota de Gemini', () => {
  afterEach(() => vi.useRealTimers());

  it('espera y reintenta cuando es la cuota por minuto y la espera es corta', async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValueOnce(cuota('GenerateRequestsPerMinutePerProjectPerModel-FreeTier', '8.3')).mockResolvedValue('ok');
    const p = conReintentos(fn);
    await vi.advanceTimersByTimeAsync(9500);
    await expect(p).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('no reintenta la cuota diaria', async () => {
    const fn = vi.fn().mockRejectedValue(cuota('GenerateRequestsPerDayPerProjectPerModel-FreeTier', '3000'));
    await expect(conReintentos(fn)).rejects.toBeInstanceOf(ApiError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('distingue minuto de dia en el mensaje', () => {
    expect(errorDeGemini(cuota('...PerMinute...', '5'))?.mensaje).toContain('último minuto');
    expect(errorDeGemini(cuota('...PerDay...', '5'))?.mensaje).toContain('diaria');
  });
});
