import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

// Компонент ErrorBoundary для отлова ошибок
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          Произошла ошибка: {this.state.error.toString()}
        </div>
      );
    }
    return this.props.children;
  }
}

const ItemTypes = {
  BLOCK: 'block',
};

const Tooltip = ({ text, children }) => (
  <div className="tooltip-container">
    {children}
    <span className="tooltip-text">{text}</span>
  </div>
);

// Компонент для группировки полей формы с подсказкой
const FormGroup = ({ label, tooltip, title, children }) => (
  <div className="form-group" title={title}>
    <Tooltip text={tooltip}>
      <label>{label}</label>
    </Tooltip>
    {children}
  </div>
);

const getBlockTypeName = (type) => {
  switch (type) {
    case 'trigger': return 'Триггер';
    case 'condition': return 'Условие';
    case 'action': return 'Действие';
    case 'communication': return 'Коммуникация';
    default: return type;
  }
};

function defaultConfig(type) {
  if (type === 'trigger')
    return {
      event: 'registration',
      status: '',
      dayOfWeek: [],
      time: ''
    };
  if (type === 'condition')
    return {
      composite: false,
      conditionType: 'purchase_amount',
      operator: '>',
      value: 1000,
      count: 1,
      category: '',
      product: '',
      pointOfSale: '',
      region: '',
      vip: false,
      logicOperator: 'AND',
      subconditions: [
        { conditionType: 'purchase_amount', operator: '>', value: 1000, count: 1, category: '', product: '', pointOfSale: '', region: '', vip: false },
        { conditionType: 'purchase_amount', operator: '>', value: 1000, count: 1, category: '', product: '', pointOfSale: '', region: '', vip: false }
      ]
    };
  if (type === 'action')
    return {
      action: 'bonus',
      bonusAmount: 100,
      discountValue: 10,
      discountType: 'fixed',
      couponCode: '',
      notificationTemplate: '',
      newStatus: '',
      apiUrl: '',
      validityPeriod: 0,
      delay: 0,
      repeat: false,
      repeatInterval: 0,
      repeatCount: 0,
      tagName: ''
    };
  if (type === 'communication')
    return {
      channel: 'email',
      subject: '',
      message: ''
    };
  return {};
}

const getBlockSummary = ({ data }) => {
  if (!data || !data.config) return "";
  const { type, config } = data;
  switch (type) {
    case "trigger":
      return `Событие: ${
        config.event === "registration" ? "Регистрация" :
        config.event === "purchase" ? "Покупка" :
        config.event === "login" ? "Вход" :
        config.event === "birthday" ? "День рождения" :
        config.event === "abandoned_cart" ? "Брошенная корзина" :
        config.event === "referral" ? "Реферальный" :
        config.event === "site_activity" ? "Активность на сайте" :
        config.event === "review" ? "Отзыв/Оценка" :
        config.event === "seasonal" ? "Сезонный/Промо" :
        config.event === "time_based" ? `Время: ${config.dayOfWeek.join(', ')} ${config.time}` :
        config.event === "nth_day" ? `Наступил ${config.day} день` :
        config.event === "status_update" ? `Обновление статуса: ${config.status}` :
        config.event
      }`;
    case "condition":
      if (!config.composite) {
        switch (config.conditionType) {
          case "purchase_amount": return `Сумма покупок ${config.operator} ${config.value}`;
          case "purchase_count": return `Количество покупок ${config.operator} ${config.count}`;
          case "category": return `Категория ${config.operator}: ${config.category}`;
          case "product": return `Конкретный товар ${config.operator}: ${config.product}`;
          case "point_of_sale": return `Точка продаж ${config.operator}: ${config.pointOfSale}`;
          case "region": return `Регион ${config.operator}: ${config.region}`;
          case "vip_status": return `VIP статус: ${config.vip ? "VIP" : "Не VIP"}`;
          default: return "";
        }
      } else {
        const [sub1, sub2] = config.subconditions;
        const getSubSummary = (sub) => {
          switch (sub.conditionType) {
            case "purchase_amount": return `Сумма покупок ${sub.operator} ${sub.value}`;
            case "purchase_count": return `Количество покупок ${sub.operator} ${sub.count}`;
            case "category": return `Категория ${sub.operator}: ${sub.category}`;
            case "product": return `Конкретный товар ${sub.operator}: ${sub.product}`;
            case "point_of_sale": return `Точка продаж ${sub.operator}: ${sub.pointOfSale}`;
            case "region": return `Регион ${sub.operator}: ${sub.region}`;
            case "vip_status": return `VIP статус: ${sub.vip ? "VIP" : "Не VIP"}`;
            default: return "";
          }
        };
        return `(${getSubSummary(sub1)} ${config.logicOperator === "AND" ? "И" : "ИЛИ"} ${getSubSummary(sub2)})`;
      }
    case "action":
      switch (config.action) {
        case "bonus": return `Начисление бонусов: ${config.bonusAmount}`;
        case "coupon": return `Купон: ${config.couponCode}`;
        case "discount": return `Скидка: ${config.discountType === "fixed" ? config.discountValue : config.discountValue + "%"}`;
        case "notification": return `Уведомление: ${config.notificationTemplate}`;
        case "status_change": return `Изменение статуса: ${config.newStatus}`;
        case "external_api": return `Вызов API: ${config.apiUrl}`;
        case "set_tag": return `Установить метку: ${config.tagName}`;
        default: return "";
      }
    case "communication":
      return `Коммуникация: ${config.channel}, Тема: ${config.subject}, Сообщение: ${config.message}`;
    default: return "";
  }
};

const evaluateSimpleCondition = (simpleConfig, eventData) => {
  switch (simpleConfig.conditionType) {
    case 'purchase_amount': {
      const { operator, value } = simpleConfig;
      const eventValue = eventData.amount;
      switch (operator) {
        case '>': return eventValue > value;
        case '>=': return eventValue >= value;
        case '<': return eventValue < value;
        case '<=': return eventValue <= value;
        case '==': return eventValue === value;
        case '!=': return eventValue !== value;
        default: return false;
      }
    }
    case 'purchase_count': {
      const { operator, count } = simpleConfig;
      const eventValue = eventData.count;
      switch (operator) {
        case '>': return eventValue > count;
        case '>=': return eventValue >= count;
        case '<': return eventValue < count;
        case '<=': return eventValue <= count;
        case '==': return eventValue === count;
        case '!=': return eventValue !== count;
        default: return false;
      }
    }
    case 'category': {
      return simpleConfig.operator === 'содержит'
        ? (eventData.category ? eventData.category.includes(simpleConfig.category) : false)
        : (simpleConfig.operator === 'полностью совпадает' ? eventData.category === simpleConfig.category : false);
    }
    case 'product': {
      return simpleConfig.operator === 'содержит'
        ? (eventData.product ? eventData.product.includes(simpleConfig.product) : false)
        : (simpleConfig.operator === 'полностью совпадает' ? eventData.product === simpleConfig.product : false);
    }
    case 'point_of_sale': {
      return simpleConfig.operator === 'содержит'
        ? (eventData.pointOfSale ? eventData.pointOfSale.includes(simpleConfig.pointOfSale) : false)
        : (simpleConfig.operator === 'полностью совпадает' ? eventData.pointOfSale === simpleConfig.pointOfSale : false);
    }
    case 'region': {
      return simpleConfig.operator === 'содержит'
        ? (eventData.region ? eventData.region.includes(simpleConfig.region) : false)
        : (simpleConfig.operator === 'полностью совпадает' ? eventData.region === simpleConfig.region : false);
    }
    case 'vip_status': {
      return eventData.vip === simpleConfig.vip;
    }
    case 'purchase_frequency': {
      const { operator, frequency } = simpleConfig;
      const eventValue = eventData.frequency;
      switch (operator) {
        case '>': return eventValue > frequency;
        case '>=': return eventValue >= frequency;
        case '<': return eventValue < frequency;
        case '<=': return eventValue <= frequency;
        case '==': return eventValue === frequency;
        case '!=': return eventValue !== frequency;
        default: return false;
      }
    }
    default:
      return false;
  }
};

const evaluateCondition = (config, eventData) => {
  if (config.composite) {
    const results = config.subconditions.map(sc => evaluateSimpleCondition(sc, eventData));
    return config.logicOperator === 'AND' ? results.every(r => r) : results.some(r => r);
  } else {
    return evaluateSimpleCondition(config, eventData);
  }
};

const executeAction = (config, eventData) => {
  if (config.channel !== undefined) {
    return `Отправлено через ${config.channel}: [${config.subject}] ${config.message}`;
  }
  switch (config.action) {
    case 'bonus': return `Начислено бонусов: ${config.bonusAmount}`;
    case 'set_tag': return `Метка установлена: ${config.tagName}`;
    case 'status_change': return `Изменение статуса: ${config.newStatus}`;
    default: return 'Действие выполнено';
  }
};

const ToolbarItem = ({ type, label, tooltip }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BLOCK,
    item: { type, label },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));
  return (
    <Tooltip text={tooltip}>
      <div ref={drag} className="toolbar-item" style={{ opacity: isDragging ? 0.5 : 1 }} title={tooltip}>
        {label}
      </div>
    </Tooltip>
  );
};

// Компонент CanvasBlock
const CanvasBlock = ({ id, left, top, data, onSelect, onDelete, isSelected, validationError }) => (
  <div
    className={`canvas-block ${isSelected ? 'selected' : ''} ${validationError ? 'error' : ''} ${data.isDeleting ? 'deleting' : ''}`}
    style={{ left, top }}
    onClick={() => onSelect(id)}
  >
    <button className="delete-button" onClick={(e) => { e.stopPropagation(); onDelete(id); }}>
      ×
    </button>
    <div className="block-header">
      <strong>{data.label || getBlockTypeName(data.type)}</strong>
    </div>
    <div className="block-type">{getBlockTypeName(data.type)}</div>
    <div className="block-summary" title={getBlockSummary({ data })}>
      {getBlockSummary({ data })}
    </div>
  </div>
);

// Компонент Canvas без panning (предыдущая версия)
const Canvas = ({ blocks, setBlocks, connections, selectedBlockId, handleBlockClick, validationErrors, onDeleteBlock, updateSelectedBlockId, setConnections }) => {
  const gridSize = 20;
  const canvasRef = useRef(null);
  const [, drop] = useDrop(() => ({
    accept: ItemTypes.BLOCK,
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const left = Math.round((offset.x - canvasRect.left) / gridSize) * gridSize;
      const top = Math.round((offset.y - canvasRect.top) / gridSize) * gridSize;
      const id = uuidv4();
      const newBlock = { id, left, top, data: { ...item, config: defaultConfig(item.type) } };
      setBlocks((prev) => [...prev, newBlock]);
      if (selectedBlockId) {
        setConnections((prev) => [...prev, { sourceId: selectedBlockId, targetId: newBlock.id }]);
        if (updateSelectedBlockId) updateSelectedBlockId(newBlock.id);
      }
    },
  }), [gridSize, setBlocks, selectedBlockId, setConnections, updateSelectedBlockId]);
  
  const setCanvasRef = useCallback((node) => {
    canvasRef.current = node;
    drop(node);
  }, [drop]);
  
  return (
    <div id="canvas" ref={setCanvasRef} className="canvas">
      <ConnectionsOverlay connections={connections} blocks={blocks} />
      {blocks.map((block) => (
        <CanvasBlock
          key={block.id}
          {...block}
          onSelect={handleBlockClick}
          onDelete={onDeleteBlock}
          isSelected={block.id === selectedBlockId}
          validationError={validationErrors.includes(block.id)}
        />
      ))}
    </div>
  );
};

const ConnectionsOverlay = ({ connections, blocks }) => (
  <svg className="connections-overlay">
    {connections.map((conn, index) => {
      const source = blocks.find((b) => b.id === conn.sourceId);
      const target = blocks.find((b) => b.id === conn.targetId);
      if (!source || !target) return null;
      const sourceX = source.left + 60;
      const sourceY = source.top + 30;
      const targetX = target.left + 60;
      const targetY = target.top + 30;
      return (
        <line
          key={index}
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
          stroke="#3498db"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
      );
    })}
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L6,3 z" fill="#3498db" />
      </marker>
    </defs>
  </svg>
);

const SidePanel = ({
  selectedBlock,
  updateBlock,
  startConnection,
  connectingSource,
  onAddNextBlock,
  blocks,
  connections,
  saveState,
  setSelectedBlockId
}) => {
  if (!selectedBlock || !selectedBlock.data || !selectedBlock.data.config) {
    return (
      <div className="side-panel empty">
        <p>Блок выбран некорректно или не содержит данных.</p>
      </div>
    );
  }
  
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (selectedBlock) {
      setLabel(selectedBlock.data.label || selectedBlock.data.type);
    }
  }, [selectedBlock]);
  
  const handleSave = useCallback(() => {
    updateBlock(selectedBlock.id, { ...selectedBlock.data, label });
  }, [selectedBlock, label, updateBlock]);
  
  const handleTriggerTypeChange = (e) => {
    const newValue = e.target.value;
    const newConfig = newValue === 'nth_day'
      ? { ...selectedBlock.data.config, event: newValue, day: selectedBlock.data.config.day || 1 }
      : { ...selectedBlock.data.config, event: newValue };
    updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
  };
  
  const renderDayCheckboxes = () => {
    const days = [
      { value: 'monday', label: 'Понедельник' },
      { value: 'tuesday', label: 'Вторник' },
      { value: 'wednesday', label: 'Среда' },
      { value: 'thursday', label: 'Четверг' },
      { value: 'friday', label: 'Пятница' },
      { value: 'saturday', label: 'Суббота' },
      { value: 'sunday', label: 'Воскресенье' }
    ];
    return (
      <div>
        {days.map((day) => (
          <label key={day.value} className="checkbox-container">
            {day.label}
            <input
              type="checkbox"
              checked={selectedBlock.data.config.dayOfWeek.includes(day.value)}
              onChange={(e) => {
                let newDays = [...selectedBlock.data.config.dayOfWeek];
                if (e.target.checked) {
                  if (!newDays.includes(day.value)) {
                    newDays.push(day.value);
                  }
                } else {
                  newDays = newDays.filter((d) => d !== day.value);
                }
                const newConfig = { ...selectedBlock.data.config, dayOfWeek: newDays };
                updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
              }}
            />
            <span className="checkmark"></span>
          </label>
        ))}
      </div>
    );
  };
  
  const renderTimeBasedFields = () =>
    selectedBlock.data.config.event === 'time_based' && (
      <>
        <FormGroup label="Дни недели:" tooltip="Выберите дни недели">
          {renderDayCheckboxes()}
        </FormGroup>
        <FormGroup label="Время:" tooltip="Выберите время">
          <input
            type="time"
            value={selectedBlock.data.config.time}
            onChange={(e) => {
              const newConfig = { ...selectedBlock.data.config, time: e.target.value };
              updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
            }}
          />
        </FormGroup>
        <div className="tags-container">
          {selectedBlock.data.config.dayOfWeek.map((day) => (
            <span key={day} className="tag">
              {day}
              <button
                className="tag-remove"
                onClick={() => {
                  const newDays = selectedBlock.data.config.dayOfWeek.filter((d) => d !== day);
                  const newConfig = { ...selectedBlock.data.config, dayOfWeek: newDays };
                  updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </>
    );
  
  const handleChannelChange = (e) => {
    const newConfig = { ...selectedBlock.data.config, channel: e.target.value };
    updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
  };
  
  const handleSubjectChange = (e) => {
    const newConfig = { ...selectedBlock.data.config, subject: e.target.value };
    updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
  };
  
  const handleMessageChange = (e) => {
    const newConfig = { ...selectedBlock.data.config, message: e.target.value };
    updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
  };
  
  const handleActionTypeChange = (e) => {
    const newConfig = { ...selectedBlock.data.config, action: e.target.value };
    updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
  };
  
  return (
    <div className="side-panel">
      <Tooltip text="Настройте свойства выбранного блока">
        <h3>Настройки блока</h3>
      </Tooltip>
      <FormGroup label="Название:" tooltip="Введите название блока (если не задано, будет использовано значение по умолчанию)">
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
      </FormGroup>
      {selectedBlock.data.type === 'trigger' ? (
        <>
          <FormGroup label="Тип триггера:" tooltip="Выберите тип триггера для запуска цепочки">
            <select value={selectedBlock.data.config.event} onChange={handleTriggerTypeChange}>
              <option value="registration">Регистрация</option>
              <option value="purchase">Покупка</option>
              <option value="login">Вход</option>
              <option value="birthday">День рождения</option>
              <option value="abandoned_cart">Брошенная корзина</option>
              <option value="referral">Реферальный</option>
              <option value="site_activity">Активность на сайте</option>
              <option value="review">Отзыв/Оценка</option>
              <option value="seasonal">Сезонный/Промо</option>
              <option value="nth_day">Наступил N день</option>
              <option value="status_update">Обновление статуса</option>
              <option value="time_based">Временной триггер</option>
            </select>
          </FormGroup>
          {selectedBlock.data.config.event === 'nth_day' && (
            <FormGroup label="Номер дня:" tooltip="Введите номер дня, например 7 для 7-го дня">
              <input
                type="number"
                value={selectedBlock.data.config.day}
                onChange={(e) => {
                  const newConfig = { ...selectedBlock.data.config, day: parseInt(e.target.value, 10) || 1 };
                  updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                }}
              />
            </FormGroup>
          )}
          {selectedBlock.data.config.event === 'status_update' && (
            <FormGroup label="Статус для триггера:" tooltip="Выберите статус, при изменении которого будет запускаться цепочка">
              <select
                value={selectedBlock.data.config.status}
                onChange={(e) => {
                  const newConfig = { ...selectedBlock.data.config, status: e.target.value };
                  updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                }}
              >
                <option value="">-- Выберите статус --</option>
                <option value="new">Новый</option>
                <option value="active">Активный</option>
                <option value="vip">VIP</option>
                <option value="inactive">Неактивный</option>
              </select>
            </FormGroup>
          )}
          {selectedBlock.data.config.event === 'time_based' && renderTimeBasedFields()}
        </>
      ) : selectedBlock.data.type === 'condition' ? (
        <>
          <FormGroup label="Составное условие:" tooltip="Отметьте, если условие состоит из двух подусловий" title="Если включено – комбинируются два условия">
            <input
              type="checkbox"
              checked={selectedBlock.data.config.composite}
              onChange={(e) => {
                const newConfig = { ...selectedBlock.data.config, composite: e.target.checked };
                updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
              }}
            /> (если включено – комбинируются два условия)
          </FormGroup>
          {!selectedBlock.data.config.composite && (
            <>
              <FormGroup label="Тип условия:" tooltip="Выберите тип условия">
                <select value={selectedBlock.data.config.conditionType} onChange={(e) => {
                  const newConfig = { ...selectedBlock.data.config, conditionType: e.target.value };
                  updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                }}>
                  <option value="purchase_amount">Сумма покупок</option>
                  <option value="purchase_count">Количество покупок</option>
                  <option value="category">Категория товаров</option>
                  <option value="product">Конкретный товар</option>
                  <option value="point_of_sale">Точка продаж</option>
                  <option value="region">Регион</option>
                  <option value="vip_status">VIP статус</option>
                </select>
              </FormGroup>
              {selectedBlock.data.config.conditionType === 'purchase_amount' && (
                <FormGroup label="Сумма покупок:" tooltip="Задайте сумму покупок для условия">
                  <input
                    type="number"
                    value={selectedBlock.data.config.value}
                    onChange={(e) => {
                      const newConfig = { ...selectedBlock.data.config, value: parseFloat(e.target.value) };
                      updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                    }}
                  />
                </FormGroup>
              )}
              {selectedBlock.data.config.conditionType === 'purchase_count' && (
                <FormGroup label="Количество покупок:" tooltip="Задайте количество покупок для условия">
                  <input
                    type="number"
                    value={selectedBlock.data.config.count}
                    onChange={(e) => {
                      const newConfig = { ...selectedBlock.data.config, count: parseInt(e.target.value, 10) };
                      updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                    }}
                  />
                </FormGroup>
              )}
              {selectedBlock.data.config.conditionType === 'category' && (
                <>
                  <FormGroup label="Оператор:" tooltip="Выберите оператор для сравнения">
                    <select value={selectedBlock.data.config.operator} onChange={(e) => {
                      const newConfig = { ...selectedBlock.data.config, operator: e.target.value };
                      updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                    }}>
                      <option value="содержит">Содержит</option>
                      <option value="полностью совпадает">Полностью совпадает</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="Категория товаров:" tooltip="Введите название категории товаров">
                    <input
                      type="text"
                      value={selectedBlock.data.config.category}
                      onChange={(e) => {
                        const newConfig = { ...selectedBlock.data.config, category: e.target.value };
                        updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                      }}
                    />
                  </FormGroup>
                </>
              )}
              {selectedBlock.data.config.conditionType === 'product' && (
                <>
                  <FormGroup label="Оператор:" tooltip="Выберите оператор для сравнения">
                    <select value={selectedBlock.data.config.operator} onChange={(e) => {
                      const newConfig = { ...selectedBlock.data.config, operator: e.target.value };
                      updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                    }}>
                      <option value="содержит">Содержит</option>
                      <option value="полностью совпадает">Полностью совпадает</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="Конкретный товар:" tooltip="Введите название товара">
                    <input
                      type="text"
                      value={selectedBlock.data.config.product}
                      onChange={(e) => {
                        const newConfig = { ...selectedBlock.data.config, product: e.target.value };
                        updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                      }}
                      placeholder="Название товара"
                    />
                  </FormGroup>
                </>
              )}
              {selectedBlock.data.config.conditionType === 'point_of_sale' && (
                <>
                  <FormGroup label="Оператор:" tooltip="Выберите оператор для сравнения">
                    <select value={selectedBlock.data.config.operator} onChange={(e) => {
                      const newConfig = { ...selectedBlock.data.config, operator: e.target.value };
                      updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                    }}>
                      <option value="содержит">Содержит</option>
                      <option value="полностью совпадает">Полностью совпадает</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="Точка продаж:" tooltip="Укажите точку продаж">
                    <input
                      type="text"
                      value={selectedBlock.data.config.pointOfSale}
                      onChange={(e) => {
                        const newConfig = { ...selectedBlock.data.config, pointOfSale: e.target.value };
                        updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                      }}
                    />
                  </FormGroup>
                </>
              )}
              {selectedBlock.data.config.conditionType === 'region' && (
                <>
                  <FormGroup label="Оператор:" tooltip="Выберите оператор для сравнения">
                    <select value={selectedBlock.data.config.operator} onChange={(e) => {
                      const newConfig = { ...selectedBlock.data.config, operator: e.target.value };
                      updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                    }}>
                      <option value="содержит">Содержит</option>
                      <option value="полностью совпадает">Полностью совпадает</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="Регион:" tooltip="Введите название региона">
                    <input
                      type="text"
                      value={selectedBlock.data.config.region}
                      onChange={(e) => {
                        const newConfig = { ...selectedBlock.data.config, region: e.target.value };
                        updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                      }}
                      placeholder="Название региона"
                    />
                  </FormGroup>
                </>
              )}
              {selectedBlock.data.config.conditionType === 'vip_status' && (
                <FormGroup label="VIP статус:" tooltip="Выберите значение для VIP статуса">
                  <select value={selectedBlock.data.config.vip ? "true" : "false"} onChange={(e) => {
                    const newConfig = { ...selectedBlock.data.config, vip: e.target.value === "true" };
                    updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                  }}>
                    <option value="true">VIP</option>
                    <option value="false">Неактивный</option>
                  </select>
                </FormGroup>
              )}
            </>
          )}
        </>
      ) : selectedBlock.data.type === 'action' ? (
        <>
          <FormGroup label="Тип действия:" tooltip="Выберите тип действия для выполнения">
            <select value={selectedBlock.data.config.action} onChange={handleActionTypeChange}>
              <option value="bonus">Начисление бонусов</option>
              <option value="coupon">Выдача купона</option>
              <option value="discount">Предоставление скидки</option>
              <option value="notification">Уведомление/Email</option>
              <option value="status_change">Изменение статуса</option>
              <option value="external_api">Вызов внешнего API</option>
              <option value="set_tag">Установить метку</option>
            </select>
          </FormGroup>
          {selectedBlock.data.config.action === 'bonus' && (
            <FormGroup label="Сумма бонусов:" tooltip="Введите сумму бонусов">
              <input type="number" value={selectedBlock.data.config.bonusAmount} onChange={(e) => {
                const newConfig = { ...selectedBlock.data.config, bonusAmount: parseFloat(e.target.value) };
                updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
              }} />
            </FormGroup>
          )}
          {selectedBlock.data.config.action === 'coupon' && (
            <FormGroup label="Код купона:" tooltip="Введите код купона">
              <input type="text" value={selectedBlock.data.config.couponCode} onChange={(e) => {
                const newConfig = { ...selectedBlock.data.config, couponCode: e.target.value };
                updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
              }} />
            </FormGroup>
          )}
          {selectedBlock.data.config.action === 'discount' && (
            <>
              <FormGroup label="Тип скидки:" tooltip="Выберите тип скидки">
                <select value={selectedBlock.data.config.discountType} onChange={(e) => {
                  const newConfig = { ...selectedBlock.data.config, discountType: e.target.value };
                  updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                }}>
                  <option value="fixed">Фиксированная</option>
                  <option value="percentage">Процентная</option>
                </select>
              </FormGroup>
              <FormGroup label="Размер скидки:" tooltip="Введите размер скидки">
                <input type="number" value={selectedBlock.data.config.discountValue} onChange={(e) => {
                  const newConfig = { ...selectedBlock.data.config, discountValue: parseFloat(e.target.value) };
                  updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
                }} />
              </FormGroup>
            </>
          )}
          {selectedBlock.data.config.action === 'notification' && (
            <FormGroup label="Шаблон уведомления:" tooltip="Введите шаблон уведомления">
              <input type="text" value={selectedBlock.data.config.notificationTemplate} onChange={(e) => {
                const newConfig = { ...selectedBlock.data.config, notificationTemplate: e.target.value };
                updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
              }} />
            </FormGroup>
          )}
          {selectedBlock.data.config.action === 'status_change' && (
            <FormGroup label="Новый статус:" tooltip="Выберите новый статус покупателя">
              <select value={selectedBlock.data.config.newStatus} onChange={(e) => {
                const newConfig = { ...selectedBlock.data.config, newStatus: e.target.value };
                updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
              }}>
                <option value="">-- Выберите статус --</option>
                <option value="new">Новый</option>
                <option value="active">Активный</option>
                <option value="vip">VIP</option>
                <option value="inactive">Неактивный</option>
              </select>
            </FormGroup>
          )}
          {selectedBlock.data.config.action === 'external_api' && (
            <FormGroup label="URL API:" tooltip="Введите URL для API вызова">
              <input type="text" value={selectedBlock.data.config.apiUrl} onChange={(e) => {
                const newConfig = { ...selectedBlock.data.config, apiUrl: e.target.value };
                updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
              }} />
            </FormGroup>
          )}
          {selectedBlock.data.config.action === 'set_tag' && (
            <FormGroup label="Метка:" tooltip="Введите метку для аккаунта">
              <input type="text" value={selectedBlock.data.config.tagName} onChange={(e) => {
                const newConfig = { ...selectedBlock.data.config, tagName: e.target.value };
                updateBlock(selectedBlock.id, { ...selectedBlock.data, config: newConfig });
              }} placeholder="Введите метку" />
            </FormGroup>
          )}
        </>
      ) : selectedBlock.data.type === 'communication' ? (
        <>
          <FormGroup label="Канал:" tooltip="Выберите канал коммуникации (email, sms, push)">
            <select value={selectedBlock.data.config.channel} onChange={handleChannelChange}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="push">Push</option>
            </select>
          </FormGroup>
          <FormGroup label="Тема:" tooltip="Введите тему сообщения">
            <input type="text" value={selectedBlock.data.config.subject || ''} onChange={handleSubjectChange} />
          </FormGroup>
          <FormGroup label="Сообщение:" tooltip="Введите текст сообщения">
            <textarea value={selectedBlock.data.config.message} onChange={handleMessageChange} />
          </FormGroup>
        </>
      ) : null}
      <Tooltip text="Добавить следующий блок">
        <button className="add-next-button" onClick={onAddNextBlock}>
          Добавить следующий блок
        </button>
      </Tooltip>
      <Tooltip text="Сохранить изменения в блоке">
        <button className="save-button" onClick={handleSave}>
          Сохранить
        </button>
      </Tooltip>
      <Tooltip text="Начать соединение выбранного блока с другим">
        <button className="connect-button" onClick={() => startConnection(selectedBlock.id)}>
          Начать соединение {connectingSource === selectedBlock.id ? "(Исходный блок)" : ""}
        </button>
      </Tooltip>
      <p>Конфигурация: {JSON.stringify(selectedBlock.data.config)}</p>
    </div>
  );
};

const App = () => {
  const [blocks, setBlocks] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [connectingSource, setConnectingSource] = useState(null);
  const [simulationLog, setSimulationLog] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [notification, setNotification] = useState("");

  const saveState = useCallback((newBlocks, newConnections) => {
    setUndoStack((prev) => [...prev, { blocks, connections }]);
    setRedoStack([]);
    setBlocks(newBlocks);
    setConnections(newConnections);
  }, [blocks, connections]);

  const handleBlockClick = useCallback((blockId) => {
    if (connectingSource && connectingSource !== blockId) {
      const sourceBlock = blocks.find((b) => b.id === connectingSource);
      const targetBlock = blocks.find((b) => b.id === blockId);
      if (sourceBlock && targetBlock &&
          sourceBlock.data.type === 'trigger' &&
          targetBlock.data.type === 'action') {
        alert('Нельзя соединить триггер напрямую с действием. Добавьте условие между ними.');
        return;
      }
      if (sourceBlock && targetBlock &&
          sourceBlock.data.type === 'action' &&
          targetBlock.data.type === 'trigger') {
        alert('Нельзя соединять действие с исходным триггером.');
        return;
      }
      const newConnections = [...connections, { sourceId: connectingSource, targetId: blockId }];
      setSimulationLog((prev) => [...prev, `Создана связь от ${connectingSource} к ${blockId}`]);
      setConnectingSource(null);
      saveState([...blocks], [...newConnections]);
    } else {
      setSelectedBlockId(blockId);
    }
  }, [connectingSource, blocks, connections, saveState]);

  const updateBlock = useCallback((id, newData) => {
    const newBlocks = blocks.map((block) =>
      block.id === id ? { ...block, data: newData } : block
    );
    saveState(newBlocks, connections);
  }, [blocks, connections, saveState]);

  const startConnection = useCallback((blockId) => {
    setConnectingSource(blockId);
    setSimulationLog((prev) => [...prev, `Начато создание связи от блока ${blockId}. Выберите целевой блок.`]);
  }, []);

  const onDeleteBlock = useCallback((id) => {
    if (window.confirm("Вы действительно хотите удалить этот блок?")) {
      setBlocks(prevBlocks => prevBlocks.map(block => block.id === id ? { ...block, isDeleting: true } : block));
      setTimeout(() => {
        setBlocks(prevBlocks => {
          const remaining = prevBlocks.filter(block => block.id !== id);
          saveState(remaining, connections.filter(conn => conn.sourceId !== id && conn.targetId !== id));
          return remaining;
        });
        setConnections(prevConnections => prevConnections.filter(conn => conn.sourceId !== id && conn.targetId !== id));
        setNotification("Блок удален. Нажмите 'Отменить' для восстановления.");
        setTimeout(() => setNotification(""), 3000);
      }, 300);
    }
  }, [saveState, connections]);

  const validateChain = useCallback(() => {
    let errors = [];
    let visited = new Set();
    const triggers = blocks.filter((b) => b.data.type === 'trigger');
    if (triggers.length === 0) {
      errors.push('Цепочка должна начинаться с триггера.');
    }
    triggers.forEach((trigger) => {
      let currentBlock = trigger;
      visited.clear();
      while (currentBlock && !visited.has(currentBlock.id)) {
        visited.add(currentBlock.id);
        if (currentBlock.data.type === 'action' || currentBlock.data.type === 'communication')
          break;
        const conn = connections.find((conn) => conn.sourceId === currentBlock.id);
        if (!conn) {
          errors.push(`Блок ${currentBlock.id} не имеет исходящей связи.`);
          break;
        }
        currentBlock = blocks.find((b) => b.id === conn.targetId);
      }
      if (currentBlock && visited.has(currentBlock.id)) {
        errors.push(`Обнаружен цикл в цепочке, начиная с блока ${trigger.id}.`);
      }
    });
    setValidationErrors(errors);
    return errors;
  }, [blocks, connections]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const lastState = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, { blocks, connections }]);
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setBlocks(lastState.blocks);
    setConnections(lastState.connections);
  }, [undoStack, blocks, connections]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, { blocks, connections }]);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setBlocks(nextState.blocks);
    setConnections(nextState.connections);
  }, [redoStack, blocks, connections]);

  const handleExport = useCallback(() => {
    const data = JSON.stringify({ blocks, connections }, null, 2);
    alert(`Экспорт:\n${data}`);
  }, [blocks, connections]);

  const handleImport = useCallback(() => {
    const data = prompt('Вставьте JSON конфигурацию:');
    try {
      const parsed = JSON.parse(data);
      saveState(parsed.blocks, parsed.connections);
      setSimulationLog((prev) => [...prev, 'Конфигурация успешно импортирована.']);
    } catch (e) {
      alert('Неверный формат JSON');
    }
  }, [saveState]);

  const handleAddNextBlock = useCallback(() => {
    setBlocks(prevBlocks => {
      const currentBlock = prevBlocks.find(b => b.id === selectedBlockId);
      if (!currentBlock) return prevBlocks;

      let newType;
      if (currentBlock.data.type === "trigger") {
        newType = "condition";
      } else if (currentBlock.data.type === "condition") {
        newType = "action";
      } else if (currentBlock.data.type === "action") {
        newType = "communication";
      } else if (currentBlock.data.type === "communication") {
        alert("Блок коммуникации можно добавить только после блока действия.");
        return prevBlocks;
      }

      const newLeft = currentBlock.left + 200;
      const newTop = currentBlock.top;
      const newBlock = {
        id: uuidv4(),
        left: newLeft,
        top: newTop,
        data: { type: newType, label: '', config: defaultConfig(newType) }
      };

      setConnections(prevConnections => {
        const newConnection = currentBlock.data.type === 'condition'
          ? { sourceId: currentBlock.id, targetId: newBlock.id, branch: 'true' }
          : { sourceId: currentBlock.id, targetId: newBlock.id };
        return [...prevConnections, newConnection];
      });

      setSelectedBlockId(newBlock.id);
      return [...prevBlocks, newBlock];
    });
  }, [selectedBlockId]);

  const simulateChain = useCallback(() => {
    let logs = [];
    const eventData = {
      event: 'time_based',
      dayOfWeek: 'monday',
      time: '08:00',
      amount: 0,
      count: 0,
      product: '',
      category: '',
      frequency: 0,
      pointOfSale: '',
      region: '',
      vip: false
    };
    const triggers = blocks.filter((b) => {
      if (b.data.type !== 'trigger') return false;
      if (b.data.config.event === 'time_based' && eventData.event === 'time_based') {
        return b.data.config.dayOfWeek.includes(eventData.dayOfWeek) && eventData.time >= b.data.config.time;
      }
      return b.data.config.event === eventData.event;
    });
    if (triggers.length === 0) {
      logs.push(`Нет триггера для события ${eventData.event}`);
      setSimulationLog(logs);
      return;
    }
    const simulateBlock = (block, visited = new Set(), prefix = "") => {
      if (visited.has(block.id)) return [prefix + `Обнаружен цикл в блоке ${block.id}`];
      visited.add(block.id);
      let localLogs = [];
      if (block.data.type === 'trigger') {
        localLogs.push(prefix + `Триггер ${block.id} активирован`);
      } else if (block.data.type === 'condition') {
        const conditionPassed = evaluateCondition(block.data.config, eventData);
        localLogs.push(prefix + `Условие ${block.id} ${conditionPassed ? 'пройдено' : 'не пройдено'}`);
        let outConns = connections.filter((conn) => conn.sourceId === block.id);
        const branchConns = outConns.filter((conn) => conn.branch);
        if (branchConns.length > 0) {
          outConns = outConns.filter((conn) => conn.branch === (conditionPassed ? 'true' : 'false'));
          if (outConns.length === 0) {
            outConns = branchConns;
          }
        }
        outConns.forEach((conn) => {
          const nextBlock = blocks.find((b) => b.id === conn.targetId);
          if (nextBlock) {
            localLogs.push(...simulateBlock(nextBlock, new Set(visited), prefix + "  "));
          }
        });
      } else if (block.data.type === 'action') {
        localLogs.push(prefix + `Выполнено действие ${block.id}: ${executeAction(block.data.config, eventData)}`);
      } else if (block.data.type === 'communication') {
        localLogs.push(prefix + `Выполнена коммуникация ${block.id}: ${executeAction(block.data.config, eventData)}`);
      }
      if (connections.filter((conn) => conn.sourceId === block.id).length === 0) {
        localLogs.push(prefix + `Блок ${block.id} не имеет исходящих соединений.`);
      }
      return localLogs;
    };

    triggers.forEach((trigger) => {
      logs.push(`Запуск цепочки с триггера: ${trigger.id}`);
      logs.push(...simulateBlock(trigger));
    });
    setSimulationLog(logs);
  }, [blocks, connections]);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app-container">
        <div className="toolbar">
          <Tooltip text="Панель инструментов. Здесь можно перетаскивать блоки">
            <h3>Панель инструментов</h3>
          </Tooltip>
          <ToolbarItem type="trigger" label="Триггер" tooltip="Перетащите сюда, чтобы создать триггер" />
          <ToolbarItem type="condition" label="Условие" tooltip="Перетащите сюда, чтобы добавить условие" />
          <ToolbarItem type="action" label="Действие" tooltip="Перетащите сюда, чтобы добавить действие" />
          <button className="simulate-button" onClick={simulateChain} title="Запустить симуляцию цепочки">
            Симулировать цепочку
          </button>
          <button className="simulate-button" onClick={validateChain} title="Проверить корректность цепочки">
            Валидировать цепочку
          </button>
          <button className="simulate-button" onClick={handleUndo} title="Отменить последнее действие">
            Отменить
          </button>
          <button className="simulate-button" onClick={handleRedo} title="Повторить последнее отменённое действие">
            Повторить
          </button>
          <button className="simulate-button" onClick={handleExport} title="Экспортировать конфигурацию в JSON">
            Экспорт
          </button>
          <button className="simulate-button" onClick={handleImport} title="Импортировать конфигурацию из JSON">
            Импорт
          </button>
        </div>
        <Canvas
          blocks={blocks}
          setBlocks={setBlocks}
          connections={connections}
          selectedBlockId={selectedBlockId}
          handleBlockClick={handleBlockClick}
          validationErrors={validationErrors}
          onDeleteBlock={onDeleteBlock}
          updateSelectedBlockId={setSelectedBlockId}
          setConnections={setConnections}
        />
        <SidePanel
          selectedBlock={selectedBlock}
          updateBlock={updateBlock}
          startConnection={startConnection}
          connectingSource={connectingSource}
          onAddNextBlock={handleAddNextBlock}
          blocks={blocks}
          connections={connections}
          saveState={saveState}
          setSelectedBlockId={setSelectedBlockId}
        />
      </div>
      <Tooltip text="Здесь отображается лог симуляции и ошибок валидации">
        <div className="simulation-log">
          <h3>Лог симуляции и валидации</h3>
          <pre>{simulationLog.join('\n')}</pre>
          {validationErrors.length > 0 ? (
            <div className="error-log">
              <h4>Ошибки валидации:</h4>
              <ul>
                {validationErrors.map((err, i) => (<li key={i}>{err}</li>))}
              </ul>
            </div>
          ) : null}
        </div>
      </Tooltip>
      {notification && <div className="toast">{notification}</div>}
    </DndProvider>
  );
};

export default () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);