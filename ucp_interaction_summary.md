# UCP Interaction Summary (Happy Path)

이 문서는 클라이언트와 UCP 서버 간의 통신 과정을 단계별로 정리한 요약 리포트입니다. 비개발자도 쉽게 이해할 수 있도록 JSON 데이터를 표 형식으로 변환하였습니다.

---

## Step 0: Discovery (서비스 탐색)
클라이언트가 서버의 위치와 지원하는 서비스(쇼핑, 결제 등)가 무엇인지 확인하는 단계입니다.

### 1. Request
- **API**: `GET http://localhost:8182/.well-known/ucp`

| Field | Sample Value | Description |
| :--- | :--- | :--- |
| Method | GET | 정보를 요청하는 방식 |
| URL | /.well-known/ucp | 서버의 정보를 담고 있는 표준 경로 |

### 2. Response
| Field | Sample Value | Description |
| :--- | :--- | :--- |
| ucp.version | 2026-01-11 | 사용하는 UCP 프로토콜 버전 |
| services.dev.ucp.shopping | 쇼핑 서비스 정보 | 서버가 제공하는 쇼핑 서비스의 기술 규격 및 주소 |
| capabilities | checkout, order 등 | 현재 서버가 처리할 수 있는 기능 목록 (결제, 주문, 환불 등) |
| payment.handlers | shop_pay, google_pay 등 | 사용 가능한 결제 수단 및 각 수단별 설정 값 |

---

## Step 1: Create Checkout Session (체크아웃 세션 생성)
장바구니의 상품 정보를 서버로 전달하여 결제 프로세스를 시작하는 단계입니다.

### 1. Request
- **API**: `POST http://localhost:8182/checkout-sessions`

| Field | Sample Value | Description |
| :--- | :--- | :--- |
| line_items | Red Rose (1개) | 구매하려는 상품 목록과 수량 |
| buyer | John Doe (john.doe@example.com) | 구매자 이름 및 이메일 정보 |
| currency | USD | 결제에 사용할 통화 단위 |

### 2. Response
| Field | Sample Value | Description |
| :--- | :--- | :--- |
| id | 52bc8388... | 이번 결제 프로세스를 식별하는 고유 ID |
| status | ready_for_complete | 현재 단계 상태 (결제 완료 준비됨) |
| totals | 3500 (35.00 USD) | 상품 가격 합계 (서브토탈 및 최종 합계) |

---

## Step 2: Add Items (상품 추가 및 업데이트)
기존 체크아웃 세션에 새로운 상품을 추가하거나 정보를 수정하는 단계입니다.

### 1. Request
- **API**: `PUT http://localhost:8182/checkout-sessions/{checkout_id}`

| Field | Sample Value | Description |
| :--- | :--- | :--- |
| line_items | Red Rose (1개), Ceramic Pot (2개) | 업데이트된 전체 상품 목록 |
| id | (Step 1의 ID와 동일) | 수정할 대상이 되는 세션 ID |

### 2. Response
| Field | Sample Value | Description |
| :--- | :--- | :--- |
| totals | 6500 (65.00 USD) | 추가된 상품을 포함한 새로운 최종 합계 |

---

## Step 3: Apply Discount (할인 코드 적용)
쿠폰이나 할인 코드를 입력하여 가격 할인을 받는 단계입니다.

### 1. Request
- **API**: `PUT http://localhost:8182/checkout-sessions/{checkout_id}`

| Field | Sample Value | Description |
| :--- | :--- | :--- |
| discounts.codes | ["10OFF"] | 적용하려는 할인 코드 목록 |

### 2. Response
| Field | Sample Value | Description |
| :--- | :--- | :--- |
| totals.discount | 650 (6.50 USD) | 적용된 할인 금액 |
| totals.total | 5850 (58.50 USD) | 할인이 적용된 후의 최종 결제 금액 |
| discounts.applied | 10% Off | 적용된 할인의 이름과 상세 정보 |

---

## Step 4: Trigger Fulfillment (배송 방식 조회)
배송이 필요한 경우, 선택 가능한 배송 방식 목록을 요청하는 단계입니다.

### 1. Request
- **API**: `PUT http://localhost:8182/checkout-sessions/{checkout_id}`

| Field | Sample Value | Description |
| :--- | :--- | :--- |
| fulfillment.methods | [{"type": "shipping"}] | 배송(shipping) 방식 사용을 요청 |

### 2. Response
| Field | Sample Value | Description |
| :--- | :--- | :--- |
| destinations | 123 Main St 등 | 이전에 입력했거나 사용 가능한 배송지 주소록 |

---

## Step 5: Select Destination (배송지 선택)
사용 가능한 주소록 중 실제 물건을 받을 주소를 확정하는 단계입니다.

### 1. Request
- **API**: `PUT http://localhost:8182/checkout-sessions/{checkout_id}`

| Field | Sample Value | Description |
| :--- | :--- | :--- |
| selected_destination_id | addr_1 | Step 4에서 확인한 주소 중 하나를 선택 |

### 2. Response
| Field | Sample Value | Description |
| :--- | :--- | :--- |
| groups[0].options | Standard, Express 등 | 선택한 주소지로 배송 가능한 구체적인 배송 옵션과 가격 |

---

## Step 6: Select Option (배송 옵션 확정)
무료 배송, 익일 배송 등 구체적인 배송 옵션을 선택하는 단계입니다.

### 1. Request
- **API**: `PUT http://localhost:8182/checkout-sessions/{checkout_id}`

| Field | Sample Value | Description |
| :--- | :--- | :--- |
| selected_option_id | std-ship | "Standard Shipping (Free)" 옵션 선택 |

### 2. Response
| Field | Sample Value | Description |
| :--- | :--- | :--- |
| totals.fulfillment | 0 | 배송비가 0원으로 적용됨 |
| totals.total | 5850 | 모든 비용(상품+배송-할인)이 합산된 최종 금액 |

---

## Step 7: Complete Checkout (결제 및 주문 완료)
결제 수단 정보를 전송하여 결제를 최종 승인하고 주문을 생성하는 마지막 단계입니다.

### 1. Request
- **API**: `POST http://localhost:8182/checkout-sessions/{checkout_id}/complete`

| Field | Sample Value | Description |
| :--- | :--- | :--- |
| payment_data | handler: mock_payment, token: success_token | 사용자가 선택한 결제 수단과 인증 데이터 |
| risk_signals | IP, 브라우저 정보 등 | 부정 결제 방지를 위한 보안 정보 |

### 2. Response
| Field | Sample Value | Description |
| :--- | :--- | :--- |
| status | completed | 전체 프로세스가 성공적으로 완료됨 |
| order.id | 5068a920... | 생성된 주문 번호 |
| order.permalink_url | http://.../orders/... | 주문 상세 내역을 확인할 수 있는 웹 사이트 링크 |
