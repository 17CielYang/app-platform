/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import React, {useState, useRef, useEffect} from 'react'; // Added useEffect
import {useConfigContext, useDispatch, useShapeContext} from '@/components/DefaultRoot.jsx';
import PropTypes from 'prop-types';
import {Form, Input, InputNumber, Select} from 'antd'; 
import LoopCanvas from '@/components/loopNode/LoopCanvas.jsx';
import {useTranslation} from 'react-i18next';
import {JadeInputForm} from '@/components/common/JadeInputForm.jsx';
import {JadeReferenceTreeSelect} from '@/components/common/JadeReferenceTreeSelect.jsx';
import {v4 as uuidv4} from 'uuid';
import {DATA_TYPES, FROM_TYPE} from '@/common/Consts.js';

const {TextArea} = Input;

// 抑制 ResizeObserver loop 错误（仅在拖拽期间）
let isResizing = false;
const suppressResizeObserverError = () => {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    if (isResizing && args[0]?.toString?.().includes('ResizeObserver loop completed with undelivered notifications')) {
      return; // 仅在拖拽期间忽略这个特定错误
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    if (isResizing && args[0]?.toString?.().includes('ResizeObserver loop completed with undelivered notifications')) {
      return;
    }
    originalWarn.apply(console, args);
  };
  
  return () => {
    console.error = originalError;
    console.warn = originalWarn;
  };
};


/**
 * 循环节点Wrapper
 *
 * @param shapeStatus 图形状态
 * @returns {JSX.Element} 循环节点Wrapper的DOM
 */
const LoopWrapper = ({shapeStatus}) => {
  const dispatch = useDispatch();
  const shape = useShapeContext();
  const {t} = useTranslation();
  
  // 从 flowMeta 获取循环配置和子工作流ID
  const loopConfig = shape.flowMeta?.loopConfig || { loopCount: 1, initialVariables: {} };
  const subFlowId = shape.flowMeta?.subFlowId;

  const isConfig = useConfigContext();

  // 画布高度
  const initialHeight = loopConfig.canvasHeight || 500;
  const [canvasHeight, setCanvasHeight] = useState(initialHeight);

  // 本地状态用于编辑 JSON 字符串
  const [varsJson, setVarsJson] = useState(JSON.stringify(loopConfig.initialVariables, null, 2));

  // Resize 状态
  // const [isResizing, setIsResizing] = useState(false); // 不需要
  // const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 }); // 不需要
  
  const currentHeightRef = useRef(initialHeight); // 用于闭包访问
  const canvasDivRef = useRef(null); // Ref for the height-controlled div
  const wrapperRef = useRef(null); // Ref for the wrapper container
  const errorSuppressorRef = useRef(null); // 保存错误抑制器的清理函数

  const handleLoopCountChange = (value) => {
    dispatch({
      type: 'updateLoopConfig',
      payload: { loopCount: value }
    });
  };

  const handleVarsChange = (e) => {
    const val = e.target.value;
    setVarsJson(val);
    try {
      const parsed = JSON.parse(val);
      dispatch({
        type: 'updateLoopConfig',
        payload: { initialVariables: parsed }
      });
    } catch (error) {
      // JSON 格式错误时不更新 store，只更新 UI
    }
  };

  const handleSubFlowIdChange = (subFlowId) => {
    dispatch({
      type: 'updateSubFlowId',
      subFlowId: subFlowId
    });
  };

  const [form] = Form.useForm();

  // 确保 inputMappings 是 JadeInputForm 可用的格式
  const inputItems = (loopConfig.inputMappings || []).map(mapping => {
      if (!mapping.id) {
          return {
              id: uuidv4(),
              name: mapping.key || '',
              from: FROM_TYPE.INPUT, // 默认为 Input，因为无法准确解析旧数据
              value: mapping.value || '',
              type: DATA_TYPES.STRING,
          };
      }
      return mapping;
  });

  const updateLoopConfigMappings = (newItems) => {
      dispatch({
          type: 'updateLoopConfig',
          payload: { inputMappings: newItems }
      });
  };

  const addItem = (id) => {
      const newItem = {
          id,
          name: '',
          type: DATA_TYPES.STRING,
          from: FROM_TYPE.REFERENCE,
          value: undefined,
      };
      updateLoopConfigMappings([...inputItems, newItem]);
  };

  const updateItem = (id, changes) => {
      const newItems = inputItems.map(item => {
          if (item.id === id) {
              const updatedItem = { ...item };
              changes.forEach(change => {
                  updatedItem[change.key] = change.value;
              });
              return updatedItem;
          }
          return item;
      });
      updateLoopConfigMappings(newItems);
  };

  const deleteItem = (id) => {
      const newItems = inputItems.filter(item => item.id !== id);
      updateLoopConfigMappings(newItems);
  };

  const handleLoopKeyChange = (value) => {
      dispatch({
          type: 'updateLoopConfig',
          payload: { loopKey: value }
      });
  };

  // 创建拖拽处理函数，支持8个方向
  const createResizeHandler = (direction) => (e) => {
    if (shapeStatus.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = shape.width;
    const startHeight = canvasHeight;
    const startXPos = shape.x || 0;
    const startYPos = shape.y || 0;
    const scale = shape.page.scaleX || 1;
    
    let rafId = null;
    let currentH = startHeight;
    let currentW = startWidth;
    let currentX = startXPos;
    let currentY = startYPos;
    
    // 开始拖拽时启用错误抑制
    isResizing = true;
    errorSuppressorRef.current = suppressResizeObserverError();
    
    // 捕获指针，避免鼠标移出时中断拖拽
    e.target?.setPointerCapture?.(e.pointerId);

    // 添加 will-change 优化性能
    if (canvasDivRef.current) {
      canvasDivRef.current.style.willChange = 'height, width';
    }
    
    const handlePointerMove = (moveEvent) => {
      // 取消上一帧的动画，确保每次移动都能响应
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const deltaX = (moveEvent.clientX - startX) / scale;
        const deltaY = (moveEvent.clientY - startY) / scale;
        
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newX = startXPos;
        let newY = startYPos;
        
        // 根据方向计算新的宽度、高度和位置
        switch (direction) {
          case 'n': // 上边缘
            newHeight = Math.max(300, startHeight - deltaY);
            newY = startYPos + deltaY; // 向下移动节点以保持子画布位置
            break;
          case 's': // 下边缘
            newHeight = Math.max(300, startHeight + deltaY);
            break;
          case 'w': // 左边缘
            newWidth = Math.max(300, startWidth - deltaX);
            newX = startXPos + deltaX; // 向右移动节点以保持子画布位置
            break;
          case 'e': // 右边缘
            newWidth = Math.max(300, startWidth + deltaX);
            break;
          case 'nw': // 左上角
            newWidth = Math.max(300, startWidth - deltaX);
            newHeight = Math.max(300, startHeight - deltaY);
            newX = startXPos + deltaX;
            newY = startYPos + deltaY;
            break;
          case 'ne': // 右上角
            newWidth = Math.max(300, startWidth + deltaX);
            newHeight = Math.max(300, startHeight - deltaY);
            newY = startYPos + deltaY;
            break;
          case 'sw': // 左下角
            newWidth = Math.max(300, startWidth - deltaX);
            newHeight = Math.max(300, startHeight + deltaY);
            newX = startXPos + deltaX;
            break;
          case 'se': // 右下角
            newWidth = Math.max(300, startWidth + deltaX);
            newHeight = Math.max(300, startHeight + deltaY);
            break;
        }
        
        currentH = newHeight;
        currentW = newWidth;
        currentX = newX;
        currentY = newY;
        currentHeightRef.current = newHeight;
        
        // 更新 DOM style，不更新 React state（避免触发 React 渲染）
        if (canvasDivRef.current) {
          canvasDivRef.current.style.height = `${newHeight}px`;
        }
        
        // 实时更新节点尺寸和位置（和宽度一样简单直接）
        shape.width = newWidth;
        // 计算节点高度 = Header高度 + 子画布高度 + reactContainer的上下margin (12px)
        // 获取 Header 的实际高度
        let headerHeight = 0;
        if (shape.drawer?.reactContainer) {
          const headerElement = shape.drawer.reactContainer.querySelector('.react-node-header');
          if (headerElement) {
            headerHeight = headerElement.offsetHeight;
          } else {
            // 如果找不到 Header，使用估算值（toolbar 24px + description可能30px + padding 16px = 约70px）
            headerHeight = 70;
          }
        } else {
          headerHeight = 70; // 默认估算值
        }
        // 节点高度 = Header高度 + 子画布高度 + reactContainer的上下margin (6px * 2 = 12px)
        const nodeHeight = headerHeight + newHeight + 56;
        shape.resize(newWidth, nodeHeight);
        if (shape.x !== undefined) shape.x = newX;
        if (shape.y !== undefined) shape.y = newY;
        shape.invalidateAlone && shape.invalidateAlone();

        rafId = null;
      });
    };
    
    const handlePointerUp = (upEvent) => {
      // 清理所有事件监听器
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);

      // 释放指针捕获
      e.target?.releasePointerCapture?.(e.pointerId);
      
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      // 移除 will-change
      if (canvasDivRef.current) {
        canvasDivRef.current.style.willChange = '';
      }

      // 停止错误抑制
      isResizing = false;
      if (errorSuppressorRef.current) {
        errorSuppressorRef.current();
        errorSuppressorRef.current = null;
      }

      // 在下一帧统一应用所有更改，避免 ResizeObserver loop
      requestAnimationFrame(() => {
        // 同步 React state
        setCanvasHeight(currentHeightRef.current);
        
        // 等待 DOM 更新后，计算最终节点高度
        requestAnimationFrame(() => {
          // 获取 Header 的实际高度
          let headerHeight = 0;
          if (shape.drawer?.reactContainer) {
            const headerElement = shape.drawer.reactContainer.querySelector('.react-node-header');
            if (headerElement) {
              headerHeight = headerElement.offsetHeight;
            } else {
              headerHeight = 100; // 默认估算值
            }
          } else {
            headerHeight = 100; // 默认估算值
          }
          // 节点高度 = Header高度 + 子画布高度 + reactContainer的上下margin (12px)
          const finalHeight = headerHeight + currentH + 56;
          shape.resize(currentW, finalHeight);
          shape.invalidateAlone && shape.invalidateAlone();
          
          // dispatch 最终配置
          dispatch({
            type: 'updateLoopConfig',
            payload: { canvasHeight: currentHeightRef.current }
          });
        });
      });
    };
    
    // 使用 pointer 事件，确保即使鼠标移出也能持续拖拽
    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', handlePointerUp, true);
  };

  if (isConfig) {
    return (
      <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
        <Form.Item
          label={t('loopCount') || "循环次数"}
          required
        >
          <InputNumber
            min={1}
            max={100}
            value={loopConfig.loopCount}
            onChange={handleLoopCountChange}
            disabled={shapeStatus.disabled}
            style={{width: '100%'}}
          />
        </Form.Item>

        <Form form={form} component={false}>
            <JadeInputForm
                shapeStatus={shapeStatus}
                items={inputItems}
                addItem={addItem}
                updateItem={updateItem}
                deleteItem={deleteItem}
                content={<div>配置子工作流的输入参数</div>}
                maxInputLength={1000}
            />
            <div style={{ marginTop: 16, padding: '0 12px' }}>
                <div style={{ marginBottom: 8 }}>{t('loopKey') || "循环项变量 (Loop Item)"}</div>
                <Select
                    value={loopConfig.loopKey}
                    onChange={handleLoopKeyChange}
                    options={inputItems.filter(item => item.name).map(item => ({ label: item.name, value: item.name }))}
                    disabled={shapeStatus.disabled}
                    placeholder="请选择一个输入参数作为循环项"
                    style={{ width: '100%' }}
                    allowClear
                />
                <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                    {t('loopKeyTip') || "选中的参数将自动接收循环过程中的当前项"}
                </div>
            </div>
        </Form>
      </div>
    );
  }

  // 边缘和角的拖拽区域样式配置
  const resizeHandleStyle = {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: 'transparent'
  };

  const edgeHandleStyle = {
    ...resizeHandleStyle,
    backgroundColor: 'transparent'
  };

  const cornerHandleStyle = {
    ...resizeHandleStyle,
    width: '12px',
    height: '12px',
    backgroundColor: 'transparent'
  };

  return (
    <div ref={wrapperRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', minHeight: '100%' }}>
      <div className="loop-canvas-container" style={{ flex: 1, position: 'relative' }}>
        <div ref={canvasDivRef} style={{ height: canvasHeight, position: 'relative', width: '100%' }}>
          <LoopCanvas 
            shape={shape}
            subFlowId={subFlowId} 
            onSubFlowIdChange={handleSubFlowIdChange}
            readOnly={shapeStatus.disabled}
          />
        </div>
        
        {/* 边缘和角的拖拽区域 */}
        {!shapeStatus.disabled && (
          <>
            {/* 上边缘 */}
            <div
              onPointerDown={createResizeHandler('n')}
              style={{
                ...edgeHandleStyle,
                top: 0,
                left: '12px',
                right: '12px',
                height: '8px',
                cursor: 'ns-resize'
              }}
              title="拖动调整高度"
            />
            
            {/* 下边缘 */}
            <div
              onPointerDown={createResizeHandler('s')}
              style={{
                ...edgeHandleStyle,
                bottom: 0,
                left: '12px',
                right: '12px',
                height: '8px',
                cursor: 'ns-resize'
              }}
              title="拖动调整高度"
            />
            
            {/* 左边缘 */}
            <div
              onPointerDown={createResizeHandler('w')}
              style={{
                ...edgeHandleStyle,
                left: 0,
                top: '12px',
                bottom: '12px',
                width: '8px',
                cursor: 'ew-resize'
              }}
              title="拖动调整宽度"
            />
            
            {/* 右边缘 */}
            <div
              onPointerDown={createResizeHandler('e')}
              style={{
                ...edgeHandleStyle,
                right: 0,
                top: '12px',
                bottom: '12px',
                width: '8px',
                cursor: 'ew-resize'
              }}
              title="拖动调整宽度"
            />
            
            {/* 左上角 */}
            <div
              onPointerDown={createResizeHandler('nw')}
              style={{
                ...cornerHandleStyle,
                top: 0,
                left: 0,
                cursor: 'nwse-resize'
              }}
              title="拖动调整大小"
            />
            
            {/* 右上角 */}
            <div
              onPointerDown={createResizeHandler('ne')}
              style={{
                ...cornerHandleStyle,
                top: 0,
                right: 0,
                cursor: 'nesw-resize'
              }}
              title="拖动调整大小"
            />
            
            {/* 左下角 */}
            <div
              onPointerDown={createResizeHandler('sw')}
              style={{
                ...cornerHandleStyle,
                bottom: 0,
                left: 0,
                cursor: 'nesw-resize'
              }}
              title="拖动调整大小"
            />
            
            {/* 右下角 */}
            <div
              onPointerDown={createResizeHandler('se')}
              style={{
                ...cornerHandleStyle,
                bottom: 0,
                right: 0,
                cursor: 'nwse-resize'
              }}
              title="拖动调整大小"
            />
          </>
        )}
      </div>
    </div>
  );
};

LoopWrapper.propTypes = {
  shapeStatus: PropTypes.object,
};

export default LoopWrapper;
