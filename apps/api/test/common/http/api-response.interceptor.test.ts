import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { of, firstValueFrom } from 'rxjs';
import { ApiResponseInterceptor } from '../../../src/common/http/api-response.interceptor';

test('ApiResponseInterceptor wraps plain controller data into success response', async () => {
  const interceptor = new ApiResponseInterceptor<{ id: string }>();

  const result = await firstValueFrom(
    interceptor.intercept({} as never, {
      handle: () => of({ id: 'ser_1' }),
    }),
  );

  assert.deepEqual(result, {
    code: 'OK',
    message: 'success',
    data: {
      id: 'ser_1',
    },
  });
});
