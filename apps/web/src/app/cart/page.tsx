'use client';

import { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../lib/api';
import { getImageUrl } from '../../lib/utils';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { PaymentMethod } from '@mss/shared';
import styles from './cart.module.css';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, getTotalPrice, getTotalItems, clearCart } = useCart();
  const { user, isAuthenticated, activeSubscription } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.ON_SITE);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (items.length === 0) {
      return;
    }

    setIsProcessing(true);

    try {
      const orderData = {
        userId: user!.id,
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        totalAmount: getTotalPrice(),
        paymentMethod: paymentMethod,
      };

      const order = await apiClient.orders.create(orderData);

      clearCart();

      if (paymentMethod === PaymentMethod.ONLINE && (order as any).paymentUrl) {
        window.location.href = (order as any).paymentUrl;
        return;
      }

      router.push('/profile');

      addToast('Заказ успешно создан! Вы можете забрать его в нашей мастерской.', 'success', 7000);
    } catch (error: any) {
      console.error('Ошибка создания заказа:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Не удалось создать заказ. Попробуйте снова.';

      // Проверяем, если это ошибка о недостатке средств
      if (errorMessage.includes('достаточным балансом') || errorMessage.includes('Недостаточно средств')) {
        addToast(
          'Недостаточно средств на абонементе. Пополните баланс или выберите оплату при получении.',
          'warning',
          8000
        );
      } else {
        addToast(errorMessage, 'error', 8000);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1>Корзина</h1>
          {items.length > 0 && (
            <p className={styles.itemCount}>
              {getTotalItems()} {getTotalItems() === 1 ? 'товар' : getTotalItems() < 5 ? 'товара' : 'товаров'}
            </p>
          )}
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🛒</div>
            <h2>Ваша корзина пуста</h2>
            <p className={styles.emptyHint}>Добавьте товары из нашего магазина</p>
            <button onClick={() => router.push('/shop')} className={styles.shopButton}>
              Перейти в магазин
            </button>
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.items}>
              {items.map(item => (
                <div key={item.product.id} className={styles.item}>
                  <div className={styles.itemImage}>
                    {item.product.images && item.product.images.length > 0 ? (
                      <img
                        src={getImageUrl(item.product.images[0])}
                        alt={item.product.name}
                      />
                    ) : (
                      <div className={styles.imagePlaceholder}>Нет фото</div>
                    )}
                  </div>

                  <div className={styles.itemDetails}>
                    <h3>{item.product.name}</h3>
                    <p className={styles.itemPrice}>{item.product.price} ₽</p>

                    <div className={styles.quantityControl}>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Уменьшить количество"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stockQuantity}
                        aria-label="Увеличить количество"
                      >
                        +
                      </button>
                    </div>

                    {item.product.stockQuantity < 5 && (
                      <p className={styles.stockWarning}>
                        Осталось только {item.product.stockQuantity} шт.
                      </p>
                    )}
                  </div>

                  <div className={styles.itemTotal}>
                    <p className={styles.itemTotalPrice}>
                      {item.product.price * item.quantity} ₽
                    </p>
                    <button
                      className={styles.removeButton}
                      onClick={() => removeFromCart(item.product.id)}
                      aria-label="Удалить из корзины"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.sidebar}>
              <div className={styles.summary}>
                <h2>Итого</h2>

                <div className={styles.summaryRow}>
                  <span>Товары ({getTotalItems()})</span>
                  <span>{getTotalPrice()} ₽</span>
                </div>

                <div className={styles.summaryTotal}>
                  <span>Сумма заказа</span>
                  <span className={styles.totalPrice}>{getTotalPrice()} ₽</span>
                </div>

                <div className={styles.paymentMethodSection}>
                  <h3>Способ оплаты</h3>
                  <div className={styles.paymentOptions}>
                    <label className={`${styles.paymentOption} ${paymentMethod === PaymentMethod.ONLINE ? styles.paymentOptionActive : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={PaymentMethod.ONLINE}
                        checked={paymentMethod === PaymentMethod.ONLINE}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      />
                      <div className={styles.paymentOptionContent}>
                        <span className={styles.paymentOptionIcon}>💳</span>
                        <div>
                          <div className={styles.paymentOptionTitle}>Онлайн картой</div>
                          <div className={styles.paymentOptionDesc}>Безопасная оплата через Tinkoff</div>
                        </div>
                      </div>
                    </label>

                    <label className={`${styles.paymentOption} ${paymentMethod === PaymentMethod.ON_SITE ? styles.paymentOptionActive : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={PaymentMethod.ON_SITE}
                        checked={paymentMethod === PaymentMethod.ON_SITE}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      />
                      <div className={styles.paymentOptionContent}>
                        <span className={styles.paymentOptionIcon}>💵</span>
                        <div>
                          <div className={styles.paymentOptionTitle}>Оплата при получении</div>
                          <div className={styles.paymentOptionDesc}>Оплатите наличными или картой в мастерской</div>
                        </div>
                      </div>
                    </label>

                    <label className={`${styles.paymentOption} ${paymentMethod === PaymentMethod.SUBSCRIPTION ? styles.paymentOptionActive : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={PaymentMethod.SUBSCRIPTION}
                        checked={paymentMethod === PaymentMethod.SUBSCRIPTION}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        disabled={!activeSubscription}
                      />
                      <div className={styles.paymentOptionContent}>
                        <span className={styles.paymentOptionIcon}>🎫</span>
                        <div>
                          <div className={styles.paymentOptionTitle}>Оплата по абонементу</div>
                          <div className={styles.paymentOptionDesc}>
                            {activeSubscription
                              ? `Баланс: ${activeSubscription.remainingBalance.toFixed(2)} ₽`
                              : 'У вас нет активного абонемента'}
                          </div>
                          {activeSubscription && activeSubscription.remainingBalance < getTotalPrice() && (
                            <div className={styles.paymentWarning}>
                              ⚠️ Недостаточно средств (требуется {getTotalPrice()} ₽)
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  className={styles.checkoutButton}
                  onClick={handleCheckout}
                  disabled={isProcessing || !isAuthenticated}
                >
                  {isProcessing ? 'Оформление...' : 'Оформить заказ'}
                </button>

                {!isAuthenticated && (
                  <p className={styles.loginHint}>
                    Для оформления заказа необходимо{' '}
                    <a href="/login" className={styles.loginLink}>войти в аккаунт</a>
                  </p>
                )}

                <div className={styles.info}>
                  <p>💳 Оплата при получении</p>
                  <p>🏪 Самовывоз из мастерской</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
