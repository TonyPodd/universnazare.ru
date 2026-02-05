'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import ImageUpload from '../../components/ImageUpload';
import styles from './products.module.css';
import { safeGetToken } from '../../lib/token-storage';

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

interface Master {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    shortDescription: '',
    description: '',
    price: 0,
    stockQuantity: 0,
    isAvailable: true,
    masterId: '',
    images: [] as string[],
  });
  const [imageInput, setImageInput] = useState('');

  const parseCategories = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const normalizeCategories = (items: string[]) =>
    Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, mastersData] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/masters`).then(r => r.json()),
      ]);
      setProducts(productsData);
      setMasters(mastersData);
      const categories = normalizeCategories(
        productsData.flatMap((product: Product) => parseCategories(product.category || '')),
      );
      setAvailableCategories(categories);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      alert('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      shortDescription: '',
      description: '',
      price: 0,
      stockQuantity: 0,
      isAvailable: true,
      masterId: '',
      images: [],
    });
    setSelectedCategories([]);
    setCategoryInput('');
    setImageInput('');
    setShowModal(true);
  };

  const handleAddImage = () => {
    if (imageInput.trim() && !formData.images.includes(imageInput.trim())) {
      setFormData({
        ...formData,
        images: [...formData.images, imageInput.trim()],
      });
      setImageInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      price: product.price,
      stockQuantity: product.stockQuantity,
      isAvailable: product.isAvailable,
      masterId: product.master?.id || '',
      images: product.images || [],
    });
    const parsed = parseCategories(product.category || '');
    setSelectedCategories(parsed);
    setCategoryInput('');
    setAvailableCategories((current) => normalizeCategories([...current, ...parsed]));
    setImageInput('');
    setShowModal(true);
  };

  const handleAddCategories = () => {
    const incoming = parseCategories(categoryInput);
    if (incoming.length === 0) return;
    const nextCategories = normalizeCategories([...selectedCategories, ...incoming]);
    setSelectedCategories(nextCategories);
    setAvailableCategories((current) => normalizeCategories([...current, ...incoming]));
    setCategoryInput('');
  };

  const handleToggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((item) => item !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const getImagePreviewUrl = (image: string) => {
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${image}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCategories.length === 0) {
      alert('Укажите хотя бы одну категорию товара');
      return;
    }

    try {
      const token = safeGetToken();
      const url = editingProduct
        ? `${process.env.NEXT_PUBLIC_API_URL}/products/${editingProduct.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/products`;

      const response = await fetch(url, {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          category: selectedCategories.join(', '),
          masterId: formData.masterId || null,
        }),
      });

      if (!response.ok) throw new Error('Ошибка сохранения');

      alert(editingProduct ? 'Товар обновлен' : 'Товар создан');
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Не удалось сохранить товар');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот товар?')) return;

    try {
      const token = safeGetToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Ошибка удаления');

      alert('Товар удален');
      loadData();
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Не удалось удалить товар');
    }
  };

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
        <h1>Управление товарами</h1>
        <button onClick={handleCreate} className={styles.createButton}>
          Добавить товар
        </button>
      </div>

      <div className={styles.grid}>
        {products.map((product) => (
          <div key={product.id} className={styles.card}>
            <div className={styles.cardImage}>
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0].startsWith('http') ? product.images[0] : `${process.env.NEXT_PUBLIC_API_URL}${product.images[0]}`}
                  alt={product.name}
                />
              ) : (
                <div className={styles.noImage}>Нет фото</div>
              )}
            </div>

            <div className={styles.cardContent}>
              <h3>{product.name}</h3>
              <p className={styles.category}>{product.category}</p>
              <p className={styles.description}>{product.shortDescription}</p>

              <div className={styles.cardInfo}>
                <div className={styles.price}>{product.price} ₽</div>
                <div className={styles.stock}>
                  В наличии: {product.stockQuantity} шт.
                </div>
              </div>

              {product.master && (
                <div className={styles.master}>Мастер: {product.master.name}</div>
              )}

              <div className={styles.cardActions}>
                <button
                  onClick={() => handleEdit(product)}
                  className={styles.editButton}
                >
                  Редактировать
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className={styles.deleteButton}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingProduct ? 'Редактировать товар' : 'Новый товар'}</h2>
              <button onClick={() => setShowModal(false)} className={styles.closeButton}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Название *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Краткое описание *</label>
                <input
                  type="text"
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Полное описание *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Цена (₽) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Количество *</label>
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) })}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Категория *</label>
                <div className={styles.categoryInputRow}>
                  <input
                    type="text"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategories();
                      }
                    }}
                    placeholder="Введите категории через запятую"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategories}
                    className={styles.addCategoryButton}
                    disabled={!categoryInput.trim()}
                  >
                    Добавить
                  </button>
                </div>
                {availableCategories.length > 0 && (
                  <div className={styles.categoryList}>
                    {availableCategories.map((category) => (
                      <label key={category} className={styles.categoryItem}>
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={() => handleToggleCategory(category)}
                        />
                        <span>{category}</span>
                      </label>
                    ))}
                  </div>
                )}
                {selectedCategories.length > 0 && (
                  <div className={styles.categoryChips}>
                    {selectedCategories.map((category) => (
                      <span key={category} className={styles.categoryChip}>
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Мастер</label>
                <select
                  value={formData.masterId}
                  onChange={(e) => setFormData({ ...formData, masterId: e.target.value })}
                >
                  <option value="">Без мастера</option>
                  {masters.map((master) => (
                    <option key={master.id} value={master.id}>
                      {master.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  />
                  Доступен для покупки
                </label>
              </div>

              <div className={styles.formGroup}>
                <label>Изображения товара</label>
                <ImageUpload
                  label="Загрузить изображение"
                  onImageChange={(url) => {
                    if (url && !formData.images.includes(url)) {
                      setFormData({
                        ...formData,
                        images: [...formData.images, url],
                      });
                    }
                  }}
                  clearOnChange
                />
                <div className={styles.imageInputGroup}>
                  <input
                    type="text"
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImage())}
                    placeholder="https://example.com/image.jpg"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className={styles.addImageButton}
                    disabled={!imageInput.trim()}
                  >
                    Добавить
                  </button>
                </div>

                {formData.images.length > 0 && (
                  <div className={styles.imagesList}>
                    {formData.images.map((image, index) => (
                      <div key={index} className={styles.imageItem}>
                        <div className={styles.imagePreview}>
                          <img src={getImagePreviewUrl(image)} alt={`Фото ${index + 1}`} />
                        </div>
                        <div className={styles.imageItemDetails}>
                          <span className={styles.imageNumber}>Фото {index + 1}</span>
                          <span className={styles.imageUrl}>{image.substring(0, 50)}{image.length > 50 ? '...' : ''}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className={styles.removeImageButton}
                          aria-label="Удалить изображение"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <small>Можно загружать файлы с устройства или добавлять URL. Первое изображение будет основным.</small>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => setShowModal(false)} className={styles.cancelButton}>
                  Отмена
                </button>
                <button type="submit" className={styles.submitButton}>
                  {editingProduct ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
