'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCart } from '../../contexts/CartContext';
import { apiClient } from '../../lib/api';
import { getImageUrl } from '../../lib/utils';
import styles from './shop.module.css';

interface Product {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  images: string[];
  category: string;
  stockQuantity: number;
  isAvailable: boolean;
  master?: {
    id: string;
    name: string;
  };
}

export default function ShopPage() {
  const { addToCart, isInCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<string, number>>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await apiClient.products.getAvailable();
      setProducts(data);

      const categoryCounts = new Map<string, number>();
      data.forEach((product) => {
        const parsedCategories = product.category
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        parsedCategories.forEach((category) => {
          categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        });
      });

      const popularCategories = Array.from(categoryCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 6)
        .map(([category]) => category);

      setCategories(popularCategories);
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeQuery = searchQuery.trim().toLowerCase();
  const queryTokens = normalizeQuery.length > 0 ? normalizeQuery.split(/\s+/) : [];

  const filteredProducts = products.filter((product) => {
    const productCategories = product.category
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const matchesCategory =
      selectedCategory === 'all' || productCategories.includes(selectedCategory);
    if (!matchesCategory) return false;

    if (queryTokens.length === 0) return true;

    const haystack = [
      product.name,
      product.shortDescription,
      product.description,
      product.category,
      product.master?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return queryTokens.every((token) => haystack.includes(token));
  });

  const handleOpenProduct = (product: Product, initialIndex: number = 0) => {
    setSelectedProduct(product);
    setModalImageIndex(initialIndex);
  };

  const handleCloseProduct = () => {
    setSelectedProduct(null);
    setModalImageIndex(0);
  };

  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    addToCart(product, 1);
  };

  const advanceModalImage = (direction: 'next' | 'prev') => {
    if (!selectedProduct?.images || selectedProduct.images.length === 0) return;
    const total = selectedProduct.images.length;
    setModalImageIndex((prev) => {
      if (direction === 'next') return (prev + 1) % total;
      return (prev - 1 + total) % total;
    });
  };

  const handleGalleryTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleGalleryTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      advanceModalImage('next');
    } else {
      advanceModalImage('prev');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.loading}>Загрузка магазина...</div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <h1>Магазин изделий</h1>
              <p>
                Уникальные изделия ручной работы от наших талантливых мастеров.
                Каждая вещь создана с любовью и вниманием к деталям.
              </p>
            </div>
          </section>

          {categories.length > 0 && (
            <div className={styles.filtersBar}>
              <div className={styles.searchBox}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по названию, описанию, категории"
                />
              </div>
              <div className={styles.filters}>
              <button
                className={`${styles.filterButton} ${selectedCategory === 'all' ? styles.active : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                Все товары
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  className={`${styles.filterButton} ${selectedCategory === category ? styles.active : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
              </div>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className={styles.empty}>
              <h2>Товары не найдены</h2>
              <p>В данной категории пока нет доступных товаров</p>
            </div>
          ) : (
            <div className={styles.productsGrid}>
              {filteredProducts.map(product => {
                const currentIndex = currentImageIndex[product.id] || 0;
                const hasMultipleImages = product.images && product.images.length > 1;

                return (
                  <div
                    key={product.id}
                    className={styles.productCard}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenProduct(product, currentIndex)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenProduct(product, currentIndex);
                      }
                    }}
                  >
                    <div className={styles.productImage}>
                      {product.images && product.images.length > 0 ? (
                        <>
                          <img
                            src={getImageUrl(product.images[currentIndex])}
                            alt={`${product.name} - фото ${currentIndex + 1}`}
                          />
                          {hasMultipleImages && (
                            <div className={styles.imageGalleryControls}>
                              {product.images.map((_, index) => (
                                <button
                                  key={index}
                                  className={`${styles.galleryDot} ${currentIndex === index ? styles.galleryDotActive : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImageIndex({ ...currentImageIndex, [product.id]: index });
                                  }}
                                  aria-label={`Показать фото ${index + 1}`}
                                />
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={styles.imagePlaceholder}>
                          <span>Нет фото</span>
                        </div>
                      )}
                    </div>

                  <div className={styles.productContent}>
                    <h3 className={styles.productName}>{product.name}</h3>

                    {product.master && (
                      <p className={styles.productMaster}>
                        Мастер: {product.master.name}
                      </p>
                    )}

                    <p className={styles.productDescription}>
                      {product.shortDescription}
                    </p>

                    <div className={styles.productFooter}>
                      <div className={styles.productPrice}>
                        {product.price} ₽
                      </div>

                      <div className={styles.productStock}>
                        {product.stockQuantity > 0 ? (
                          <span className={styles.inStock}>
                            В наличии: {product.stockQuantity} шт.
                          </span>
                        ) : (
                          <span className={styles.outOfStock}>
                            Нет в наличии
                          </span>
                        )}
                      </div>
                    </div>

                    {product.stockQuantity > 0 && (
                      <button
                        className={styles.addToCartButton}
                        onClick={(e) => handleAddToCart(product, e)}
                      >
                        {isInCart(product.id) ? 'Добавлено в корзину ✓' : 'Добавить в корзину'}
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {selectedProduct && (
        <div className={styles.modalOverlay} onClick={handleCloseProduct}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={handleCloseProduct} aria-label="Закрыть">
              ×
            </button>
            <div className={styles.modalBody}>
              <div className={styles.modalGallery}>
                {selectedProduct.images?.length ? (
                  <>
                    <div
                      className={styles.modalImageWrapper}
                      onTouchStart={handleGalleryTouchStart}
                      onTouchEnd={handleGalleryTouchEnd}
                    >
                      <img
                        src={getImageUrl(selectedProduct.images[modalImageIndex])}
                        alt={`${selectedProduct.name} - фото ${modalImageIndex + 1}`}
                        className={styles.modalImage}
                      />
                    </div>
                    {selectedProduct.images.length > 1 && (
                      <div className={styles.modalDots}>
                        {selectedProduct.images.map((_, index) => (
                          <button
                            key={index}
                            className={`${styles.galleryDot} ${modalImageIndex === index ? styles.galleryDotActive : ''}`}
                            onClick={() => setModalImageIndex(index)}
                            aria-label={`Показать фото ${index + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.modalPlaceholder}>Нет фото</div>
                )}
              </div>

              <div className={styles.modalInfo}>
                <h2>{selectedProduct.name}</h2>
                {selectedProduct.master && (
                  <p className={styles.modalMaster}>Мастер: {selectedProduct.master.name}</p>
                )}
                <p className={styles.modalDescription}>{selectedProduct.description}</p>
                <div className={styles.modalMeta}>
                  <span className={styles.modalPrice}>{selectedProduct.price} ₽</span>
                  <span className={styles.modalStock}>
                    {selectedProduct.stockQuantity > 0
                      ? `В наличии: ${selectedProduct.stockQuantity} шт.`
                      : 'Нет в наличии'}
                  </span>
                </div>
                <div className={styles.modalCategories}>
                  {selectedProduct.category
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((category) => (
                      <span key={category} className={styles.modalCategoryChip}>
                        {category}
                      </span>
                    ))}
                </div>
                {selectedProduct.stockQuantity > 0 && (
                  <button
                    className={styles.modalAddButton}
                    onClick={(e) => handleAddToCart(selectedProduct, e)}
                  >
                    {isInCart(selectedProduct.id) ? 'В корзине ✓' : 'Добавить в корзину'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
