# 数字藏品运营与展示平台接口契约草案

## 文档目标

本文档用于为 M1、M2 主链路接口补充请求 DTO、响应 DTO 和错误码映射，作为前后端联调与 `packages/api-contracts` 抽取前的统一草案。

## 适用范围

- M1：登录、系列、批次、激活码、藏品激活领取
- M2：内容草稿、提交审核、审核处理、公开展示

## 通用响应结构

### 成功

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

### 失败

```json
{
  "code": "VALIDATION_ERROR",
  "message": "validation failed",
  "details": {}
}
```

## `POST /admin-api/auth/login`

### 请求 DTO

```json
{
  "username": "ops_admin",
  "password": "string"
}
```

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "accessToken": "jwt-token",
    "user": {
      "id": "adm_xxx",
      "accountNo": "ADM0001",
      "username": "ops_admin",
      "displayName": "运营管理员",
      "roles": ["super_admin"]
    }
  }
}
```

### 错误码

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `ACCOUNT_DISABLED`

## `GET /admin-api/series`

### Query DTO

- `page`
- `pageSize`
- `keyword`
- `status`

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "ser_xxx",
        "seriesNo": "SER-001",
        "name": "星辉远征",
        "description": "系列描述",
        "status": "ENABLED",
        "createdAt": 1778666400000
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

### 错误码

- `UNAUTHORIZED`
- `FORBIDDEN`

## `POST /admin-api/series`

### 请求 DTO

```json
{
  "name": "星辉远征",
  "description": "系列描述"
}
```

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "ser_xxx",
    "seriesNo": "SER-001",
    "name": "星辉远征",
    "description": "系列描述",
    "status": "ENABLED"
  }
}
```

### 错误码

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `SERIES_NAME_DUPLICATED`

## `GET /admin-api/issuance-batches`

### Query DTO

- `page`
- `pageSize`
- `keyword`
- `seriesId`
- `status`

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "bat_xxx",
        "batchNo": "BAT-001",
        "seriesId": "ser_xxx",
        "seriesName": "星辉远征",
        "seriesStatus": "ENABLED",
        "name": "第一批",
        "quantity": 100,
        "generatedCount": 40,
        "status": "ENABLED",
        "activateValidFrom": 1778620800000,
        "activateValidTo": 1781308800000
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

### 错误码

- `UNAUTHORIZED`
- `FORBIDDEN`

## `GET /admin-api/issuance-batches/:batchId`

### Path DTO

- `batchId`

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "bat_xxx",
    "batchNo": "BAT-001",
    "seriesId": "ser_xxx",
    "seriesName": "星辉远征",
    "seriesStatus": "ENABLED",
    "name": "第一批",
    "quantity": 100,
    "generatedCount": 40,
    "status": "ENABLED",
    "activateValidFrom": 1778620800000,
    "activateValidTo": 1781308800000,
    "remark": "线下活动首发",
    "createdAt": 1778620800000,
    "updatedAt": 1778620800000
  }
}
```

### 错误码

- `UNAUTHORIZED`
- `FORBIDDEN`
- `ISSUANCE_BATCH_NOT_FOUND`

## `POST /admin-api/issuance-batches`

### 请求 DTO

```json
{
  "seriesId": "ser_xxx",
  "name": "第一批",
  "quantity": 100,
  "activateValidFrom": "2026-05-13T00:00:00Z",
  "activateValidTo": "2026-06-13T00:00:00Z",
  "remark": "线下活动首发"
}
```

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "bat_xxx",
    "batchNo": "BAT-001",
    "seriesId": "ser_xxx",
    "name": "第一批",
    "quantity": 100,
    "status": "ENABLED"
  }
}
```

### 错误码

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `SERIES_NOT_FOUND`
- `SERIES_DISABLED`
- `INVALID_ISSUANCE_BATCH_VALID_TIME_RANGE`

## `GET /admin-api/activation-codes`

### Query DTO

- `page`
- `pageSize`
- `batchId`
- `status`
- `keyword`

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "ac_xxx",
        "code": "UCXH-7K82-A11X",
        "batchId": "bat_xxx",
        "batchName": "第一批",
        "collectionId": "col_xxx",
        "collectionNo": "COL-0001",
        "status": "UNISSUED",
        "expiredAt": 1781308800000
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

### 错误码

- `UNAUTHORIZED`
- `FORBIDDEN`

## `POST /admin-api/activation-codes/generate`

### 请求 DTO

```json
{
  "batchId": "bat_xxx",
  "count": 20,
  "issuedChannel": "offline_event"
}
```

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "batchId": "bat_xxx",
    "generatedCount": 20,
    "activationCodes": [
      {
        "id": "ac_xxx",
        "code": "UCXH-7K82-A11X",
        "collectionId": "col_xxx",
        "collectionNo": "COL-0001",
        "status": "UNISSUED"
      }
    ]
  }
}
```

### 错误码

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `ISSUANCE_BATCH_NOT_FOUND`
- `ISSUANCE_BATCH_DISABLED`
- `SERIES_DISABLED`
- `ISSUANCE_BATCH_ID_REQUIRED`
- `ACTIVATION_CODE_GENERATION_EXCEEDS_BATCH_QUANTITY`
- `COLLECTION_NO_GENERATION_FAILED`
- `ACTIVATION_CODE_GENERATION_FAILED`

## `GET /admin-api/collections`

### Query DTO

- `page`
- `pageSize`
- `seriesId`
- `batchId`
- `status`
- `ownerMemberId`

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "col_xxx",
        "collectionNo": "COL-0001",
        "seriesName": "星辉远征",
        "batchName": "第一批",
        "status": "PENDING_CLAIM",
        "currentOwnerMemberId": null,
        "claimedAt": null
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

### 错误码

- `UNAUTHORIZED`
- `FORBIDDEN`

## `POST /member-api/auth/wechat-miniapp`

联调说明：
当前返回正式 member access token（JWT）。
会员侧接口统一通过 `Authorization: Bearer <memberAccessToken>` 传递会员上下文；历史 mock token 仅用于兼容本地旧会话。

### 请求 DTO

```json
{
  "code": "wechat-login-code"
}
```

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "accessToken": "member-jwt-token",
    "member": {
      "id": "mem_xxx",
      "memberNo": "MEM0001",
      "nickname": "小王",
      "avatarUrl": "https://example.com/avatar.png",
      "status": "ACTIVE"
    }
  }
}
```

### 错误码

- `VALIDATION_ERROR`
- `WECHAT_AUTH_FAILED`
- `MEMBER_ACCOUNT_FROZEN`

## `GET /member-api/auth/me`

联调说明：
请求头要求携带 `Authorization: Bearer <memberAccessToken>`。

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "mem_xxx",
    "memberNo": "MEM0001",
    "nickname": "小王",
    "avatarUrl": "https://example.com/avatar.png",
    "status": "ACTIVE"
  }
}
```

### 错误码

- `UNAUTHORIZED`

## `POST /member-api/collection-activation`

联调说明：
请求头要求携带 `Authorization: Bearer <memberAccessToken>`。

### 请求 DTO

```json
{
  "activationCode": "UCXH-7K82-A11X"
}
```

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "collection": {
      "id": "col_xxx",
      "collectionNo": "COL-0001",
      "status": "OWNED",
      "claimedAt": "2026-05-13T12:00:00Z"
    }
  }
}
```

### 错误码

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `MEMBER_ACCOUNT_FROZEN`
- `ACTIVATION_CODE_INVALID`
- `ACTIVATION_CODE_USED`
- `ACTIVATION_CODE_EXPIRED`
- `ACTIVATION_CODE_VOIDED`

## `GET /member-api/my/collections`

联调说明：
请求头要求携带 `Authorization: Bearer <memberAccessToken>`。

### Query DTO

- `page`
- `pageSize`
- `status`

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "col_xxx",
        "collectionNo": "COL-0001",
        "status": "OWNED",
        "seriesName": "星辉远征",
        "coverImageUrl": null,
        "contentPublishStatus": "UNPUBLISHED",
        "claimedAt": "2026-05-13T12:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

### 错误码

- `UNAUTHORIZED`

## `GET /member-api/my/collections/:collectionId/content`

### Path DTO

- `collectionId`

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "collectionId": "col_xxx",
    "currentVersion": {
      "id": "ccv_xxx",
      "versionNo": 1,
      "title": "",
      "summary": "",
      "coverImageUrl": null,
      "contentPayload": {},
      "editStatus": "DRAFT",
      "publishStatus": "UNPUBLISHED"
    }
  }
}
```

### 错误码

- `UNAUTHORIZED`
- `RESOURCE_NOT_FOUND`
- `COLLECTION_NOT_OWNED_BY_MEMBER`

## `POST /member-api/my/collections/:collectionId/content/drafts`

### 请求 DTO

```json
{
  "title": "我的藏品标题",
  "summary": "我的藏品简介",
  "coverImageUrl": "https://example.com/cover.png",
  "contentPayload": {
    "blocks": []
  }
}
```

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "versionId": "ccv_xxx",
    "versionNo": 2,
    "editStatus": "DRAFT",
    "publishStatus": "UNPUBLISHED",
    "updatedAt": "2026-05-13T12:30:00Z"
  }
}
```

### 错误码

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `COLLECTION_NOT_OWNED_BY_MEMBER`
- `COLLECTION_NOT_EDITABLE`

## `POST /member-api/my/collections/:collectionId/content/submissions`

### 请求 DTO

```json
{
  "versionId": "ccv_xxx"
}
```

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "versionId": "ccv_xxx",
    "editStatus": "UNDER_REVIEW",
    "reviewStatus": "PENDING_MACHINE",
    "submittedAt": "2026-05-13T13:00:00Z"
  }
}
```

### 错误码

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `COLLECTION_NOT_OWNED_BY_MEMBER`
- `CONTENT_VERSION_NOT_FOUND`
- `CONTENT_VERSION_ALREADY_SUBMITTED`

## `GET /admin-api/collection-reviews`

### Query DTO

- `page`
- `pageSize`
- `reviewStatus`
- `seriesId`
- `batchId`

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "reviewId": "crr_xxx",
        "collectionId": "col_xxx",
        "collectionNo": "COL-0001",
        "contentVersionId": "ccv_xxx",
        "versionNo": 2,
        "reviewStage": "MANUAL",
        "reviewStatus": "PENDING_MANUAL",
        "submittedAt": "2026-05-13T13:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

### 错误码

- `UNAUTHORIZED`
- `FORBIDDEN`

## `POST /admin-api/collection-reviews/:reviewId/approve`

### 请求 DTO

```json
{
  "comment": "审核通过"
}
```

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "reviewId": "crr_xxx",
    "reviewStatus": "MANUAL_APPROVED",
    "publishStatus": "PUBLISHED",
    "reviewedAt": "2026-05-13T14:00:00Z"
  }
}
```

### 错误码

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `REVIEW_RECORD_NOT_FOUND`
- `REVIEW_STATUS_INVALID`

## `POST /admin-api/collection-reviews/:reviewId/reject`

### 请求 DTO

```json
{
  "reason": "封面内容不符合规范"
}
```

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "reviewId": "crr_xxx",
    "reviewStatus": "MANUAL_REJECTED",
    "publishStatus": "TAKEDOWN",
    "reviewedAt": "2026-05-13T14:00:00Z"
  }
}
```

### 错误码

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `REVIEW_RECORD_NOT_FOUND`
- `REVIEW_STATUS_INVALID`

## `GET /public-api/collections/:slug`

### Path DTO

- `slug`

### 响应 DTO

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "collectionNo": "COL-0001",
    "slug": "col-0001",
    "title": "我的藏品标题",
    "summary": "我的藏品简介",
    "coverImageUrl": "https://example.com/cover.png",
    "contentPayload": {
      "blocks": []
    },
    "owner": {
      "memberNo": "MEM0001",
      "nickname": "小王"
    },
    "publishedAt": "2026-05-13T14:00:00Z"
  }
}
```

### 错误码

- `RESOURCE_NOT_FOUND`
- `COLLECTION_NOT_PUBLIC`

## 后续收敛建议

- 将本文档中的 DTO 提取到 `packages/api-contracts`
- 将错误码提取到 `packages/shared-config`
- 将状态枚举提取到 `packages/shared-types`
