import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { ADMIN_REQUIRED_PERMISSIONS_KEY } from '../../../../src/modules/admin/auth/admin-permissions.decorator';
import {
  ADMIN_PERMISSION_NOTIFICATIONS_DISPATCH_RETRY,
  ADMIN_PERMISSION_NOTIFICATIONS_READ,
  ADMIN_PERMISSION_NOTIFICATIONS_TEMPLATE_CREATE,
  ADMIN_PERMISSION_NOTIFICATIONS_TEMPLATE_TOGGLE_STATUS,
  ADMIN_PERMISSION_NOTIFICATIONS_TEMPLATE_UPDATE,
} from '../../../../src/modules/admin/auth/admin-permission-keys';
import { NotificationsController } from '../../../../src/modules/admin/notifications/notifications.controller';

test('NotificationsController overview/read endpoints require notifications.read', () => {
  const targets = [
    NotificationsController.prototype.getNotificationsOverview,
    NotificationsController.prototype.listNotificationDispatchRecords,
    NotificationsController.prototype.listNotificationFailureSummary,
    NotificationsController.prototype.getNotificationDispatchHistory,
    NotificationsController.prototype.getNotificationDispatchRecord,
    NotificationsController.prototype.listNotificationTemplates,
    NotificationsController.prototype.getNotificationTemplate,
  ];

  for (const target of targets) {
    const required = Reflect.getMetadata(ADMIN_REQUIRED_PERMISSIONS_KEY, target);
    assert.deepEqual(required, [ADMIN_PERMISSION_NOTIFICATIONS_READ]);
  }
});

test('NotificationsController retry endpoint requires notifications.dispatch.retry', () => {
  const required = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    NotificationsController.prototype.retryNotificationDispatch,
  );

  assert.deepEqual(required, [ADMIN_PERMISSION_NOTIFICATIONS_DISPATCH_RETRY]);
});

test('NotificationsController create/update/status endpoints require the expected action permissions', () => {
  const createRequired = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    NotificationsController.prototype.createNotificationTemplate,
  );
  const updateRequired = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    NotificationsController.prototype.updateNotificationTemplate,
  );
  const statusRequired = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    NotificationsController.prototype.updateNotificationTemplateStatus,
  );

  assert.deepEqual(createRequired, [ADMIN_PERMISSION_NOTIFICATIONS_TEMPLATE_CREATE]);
  assert.deepEqual(updateRequired, [ADMIN_PERMISSION_NOTIFICATIONS_TEMPLATE_UPDATE]);
  assert.deepEqual(statusRequired, [
    ADMIN_PERMISSION_NOTIFICATIONS_TEMPLATE_TOGGLE_STATUS,
  ]);
});
