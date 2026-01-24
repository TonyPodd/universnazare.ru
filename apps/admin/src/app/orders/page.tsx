'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import styles from './orders.module.css';

const QRScanner = dynamic(() => import('../../components/QRScanner'), { ssr: false });

interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  status: string;
  paymentMethod: 'ON_SITE' | 'SUBSCRIPTION';
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      name: string;
    };
  }>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showScanner, setShowScanner] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Ошибка загрузки заказов');

      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Не удалось загрузить заказы');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Ошибка обновления статуса');

      alert('Статус заказа обновлен');
      loadOrders();
      setScannedOrder(null);
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Не удалось обновить статус');
    }
  };

  const handleScan = async () => {
    if (!scanInput.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/orders/qr/${scanInput.trim()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Заказ не найден');

      const order = await response.json();
      setScannedOrder(order);
      setScanInput('');
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Заказ не найден или QR-код неверный');
    }
  };

  const handleCameraScan = async (decodedText: string) => {
    setShowCameraScanner(false);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/orders/qr/${decodedText.trim()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Заказ не найден');

      const order = await response.json();
      setScannedOrder(order);
      setShowScanner(true);
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Заказ не найден или QR-код неверный');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Ожидает', className: styles.statusPending },
      CONFIRMED: { label: 'Подтвержден', className: styles.statusConfirmed },
      READY: { label: 'Готов к выдаче', className: styles.statusReady },
      COMPLETED: { label: 'Выдан', className: styles.statusCompleted },
      CANCELLED: { label: 'Отменен', className: styles.statusCancelled },
    };
    const statusInfo = statusMap[status] || { label: status, className: '' };
    return <span className={`${styles.statusBadge} ${statusInfo.className}`}>{statusInfo.label}</span>;
  };

  const getPaymentMethodLabel = (paymentMethod: 'ON_SITE' | 'SUBSCRIPTION') => {
    const paymentMap: Record<string, string> = {
      ON_SITE: '💵 Оплата при получении',
      SUBSCRIPTION: '🎫 Оплата по абонементу',
    };
    return paymentMap[paymentMethod] || paymentMethod;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(order => order.status === filter);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Управление заказами</h1>
        <button onClick={() => setShowScanner(!showScanner)} className={styles.scanButton}>
          {showScanner ? 'Закрыть сканер' : 'Сканировать QR-код'}
        </button>
      </div>

      {showScanner && (
        <div className={styles.scannerSection}>
          <h3>Сканер QR-кодов</h3>
          <p className={styles.scannerHint}>
            Введите ID заказа из QR-кода или отсканируйте его камерой
          </p>
          <div className={styles.scannerInput}>
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleScan()}
              placeholder="ID заказа или отсканируйте QR"
              autoFocus
            />
            <button onClick={handleScan} className={styles.scanSubmit}>
              Найти заказ
            </button>
            <button onClick={() => setShowCameraScanner(true)} className={styles.cameraButton}>
              📷 Камера
            </button>
          </div>

          {scannedOrder && (
            <div className={styles.scannedOrder}>
              <h4>Найден заказ</h4>
              <div className={styles.orderDetails}>
                <p><strong>Клиент:</strong> {scannedOrder.user.firstName} {scannedOrder.user.lastName}</p>
                <p><strong>Email:</strong> {scannedOrder.user.email}</p>
                <p><strong>Дата:</strong> {formatDate(scannedOrder.createdAt)}</p>
                <p><strong>Сумма:</strong> {scannedOrder.totalAmount} ₽</p>
                <p><strong>Способ оплаты:</strong> {getPaymentMethodLabel(scannedOrder.paymentMethod)}</p>
                <p><strong>Статус:</strong> {getStatusBadge(scannedOrder.status)}</p>

                <div className={styles.orderItemsList}>
                  <strong>Товары:</strong>
                  {scannedOrder.items.map((item) => (
                    <div key={item.id} className={styles.orderItemDetail}>
                      {item.product.name} × {item.quantity} = {item.price * item.quantity} ₽
                    </div>
                  ))}
                </div>

                {scannedOrder.status === 'READY' && (
                  <button
                    onClick={() => updateOrderStatus(scannedOrder.id, 'COMPLETED')}
                    className={styles.completeButton}
                  >
                    Отметить как выданный
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.filters}>
        <button
          onClick={() => setFilter('all')}
          className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
        >
          Все ({orders.length})
        </button>
        <button
          onClick={() => setFilter('PENDING')}
          className={`${styles.filterButton} ${filter === 'PENDING' ? styles.active : ''}`}
        >
          Ожидают ({orders.filter(o => o.status === 'PENDING').length})
        </button>
        <button
          onClick={() => setFilter('CONFIRMED')}
          className={`${styles.filterButton} ${filter === 'CONFIRMED' ? styles.active : ''}`}
        >
          Подтверждены ({orders.filter(o => o.status === 'CONFIRMED').length})
        </button>
        <button
          onClick={() => setFilter('READY')}
          className={`${styles.filterButton} ${filter === 'READY' ? styles.active : ''}`}
        >
          Готовы ({orders.filter(o => o.status === 'READY').length})
        </button>
        <button
          onClick={() => setFilter('COMPLETED')}
          className={`${styles.filterButton} ${filter === 'COMPLETED' ? styles.active : ''}`}
        >
          Выданы ({orders.filter(o => o.status === 'COMPLETED').length})
        </button>
      </div>

      <div className={styles.ordersList}>
        {filteredOrders.length === 0 ? (
          <div className={styles.empty}>Нет заказов</div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <div>
                  <h3>Заказ от {formatDate(order.createdAt)}</h3>
                  <p className={styles.orderCustomer}>
                    {order.user.firstName} {order.user.lastName} • {order.user.email}
                  </p>
                </div>
                {getStatusBadge(order.status)}
              </div>

              <div className={styles.orderItems}>
                {order.items.map((item) => (
                  <div key={item.id} className={styles.orderItem}>
                    {item.product.name} × {item.quantity} = {item.price * item.quantity} ₽
                  </div>
                ))}
              </div>

              <div className={styles.orderFooter}>
                <div className={styles.orderInfo}>
                  <div className={styles.orderTotal}>Итого: {order.totalAmount} ₽</div>
                  <div className={styles.orderPayment}>{getPaymentMethodLabel(order.paymentMethod)}</div>
                </div>

                <div className={styles.orderActions}>
                  {order.status === 'PENDING' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                      className={styles.confirmButton}
                    >
                      Подтвердить
                    </button>
                  )}
                  {order.status === 'CONFIRMED' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'READY')}
                      className={styles.readyButton}
                    >
                      Готов к выдаче
                    </button>
                  )}
                  {order.status === 'READY' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                      className={styles.completeButton}
                    >
                      Выдан
                    </button>
                  )}
                  {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                      className={styles.cancelButton}
                    >
                      Отменить
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCameraScanner && (
        <QRScanner
          onScan={handleCameraScan}
          onClose={() => setShowCameraScanner(false)}
        />
      )}
    </div>
  );
}
