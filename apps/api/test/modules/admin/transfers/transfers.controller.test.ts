import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { ADMIN_REQUIRED_PERMISSIONS_KEY } from '../../../../src/modules/admin/auth/admin-permissions.decorator';
import {
  ADMIN_PERMISSION_TRANSFERS_COMPLETE,
  ADMIN_PERMISSION_TRANSFERS_EXPIRE,
  ADMIN_PERMISSION_TRANSFERS_READ,
  ADMIN_PERMISSION_TRANSFERS_ROLLBACK,
  ADMIN_PERMISSION_TRANSFERS_SYNC_OWNER,
} from '../../../../src/modules/admin/auth/admin-permission-keys';
import { TransfersController } from '../../../../src/modules/admin/transfers/transfers.controller';

test('TransfersController read endpoints require transfers.read', () => {
  const targets = [
    TransfersController.prototype.listTransferOrders,
    TransfersController.prototype.getTransferOperationsOverview,
    TransfersController.prototype.listTransferOperationRecords,
    TransfersController.prototype.getTransferOrderHistory,
  ];

  for (const target of targets) {
    const required = Reflect.getMetadata(ADMIN_REQUIRED_PERMISSIONS_KEY, target);
    assert.deepEqual(required, [ADMIN_PERMISSION_TRANSFERS_READ]);
  }
});

test('TransfersController action endpoints require the expected transfer action permissions', () => {
  const completeRequired = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    TransfersController.prototype.completeTransferOrder,
  );
  const rollbackRequired = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    TransfersController.prototype.rollbackTransferOrder,
  );
  const expireRequired = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    TransfersController.prototype.expireTransferOrder,
  );
  const syncOwnerRequired = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    TransfersController.prototype.syncTransferOrderOwner,
  );

  assert.deepEqual(completeRequired, [ADMIN_PERMISSION_TRANSFERS_COMPLETE]);
  assert.deepEqual(rollbackRequired, [ADMIN_PERMISSION_TRANSFERS_ROLLBACK]);
  assert.deepEqual(expireRequired, [ADMIN_PERMISSION_TRANSFERS_EXPIRE]);
  assert.deepEqual(syncOwnerRequired, [ADMIN_PERMISSION_TRANSFERS_SYNC_OWNER]);
});
