'use client';

import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { PaymentMethod } from '@mss/shared';
import { useToast } from '../contexts/ToastContext';
import { apiClient } from '../lib/api';
import { useRouter } from 'next/navigation';
import styles from './Cart.module.css';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, getTotalPrice, getTotalItems, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
        paymentMethod: PaymentMethod.ON_SITE,
      };

      const order = await apiClient.orders.create(orderData);

      // Очистить корзину после успешного создания заказа
      clearCart();
      setIsOpen(false);

      // Перенаправить на страницу профиля с заказами
      router.push('/profile');

      addToast('Заказ успешно создан! Вы можете забрать его в нашей мастерской.', 'success', 7000);
    } catch (error) {
      console.error('Ошибка создания заказа:', error);
      addToast('Не удалось создать заказ. Попробуйте снова.', 'error', 7000);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalItems = getTotalItems();

  return (
    <>
      <button
        className={styles.cartButton}
        onClick={() => setIsOpen(true)}
        aria-label="Корзина"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 2L7 6H3L5 20H19L21 6H17L15 2H9Z" />
          <circle cx="9" cy="20" r="1" />
          <circle cx="15" cy="20" r="1" />
        </svg>
        {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <h2>Корзина</h2>
              <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>

            <div className={styles.content}>
              {items.length === 0 ? (
                <div className={styles.empty}>
                  <p>Корзина пуста</p>
                  <p className={styles.emptyHint}>Добавьте товары из магазина</p>
                </div>
              ) : (
                <>
                  <div className={styles.items}>
                    {items.map(item => (
                      <div key={item.product.id} className={styles.item}>
                        <div className={styles.itemImage}>
                          {item.product.images && item.product.images.length > 0 ? (
                            <img
                              src={item.product.images[0].startsWith('http') ? item.product.images[0] : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${item.product.images[0]}`}
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
                            >
                              −
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stockQuantity}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          className={styles.removeButton}
                          onClick={() => removeFromCart(item.product.id)}
                          aria-label="Удалить"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className={styles.footer}>
                    <div className={styles.total}>
                      <span>Итого:</span>
                      <span className={styles.totalPrice}>{getTotalPrice()} ₽</span>
                    </div>

                    <button
                      className={styles.checkoutButton}
                      onClick={handleCheckout}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Оформление...' : 'Оформить заказ'}
                    </button>

                    {!isAuthenticated && (
                      <p className={styles.loginHint}>
                        Для оформления заказа необходимо войти в аккаунт
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
