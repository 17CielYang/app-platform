/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import React, {useState, useRef} from 'react'; // Added useRef
import {useConfigContext, useDispatch, useShapeContext} from '@/components/DefaultRoot.jsx';
import PropTypes from 'prop-types';
import {Form, Input, InputNumber} from 'antd';
import LoopCanvas from '@/components/loopNode/LoopCanvas.jsx';
import {useTranslation} from 'react-i18next';

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
  
  // 从 flowMeta 获取循环配置和子画布数据
  const loopConfig = shape.flowMeta?.loopConfig || { loopCount: 1, initialVariables: {} };
  const subCanvasData = shape.flowMeta?.subCanvasData;

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
  const errorSuppressorRef = useRef(null); // 保存错误抑制器的清理函数
  const handleRef = useRef(null); // 拖拽手柄 ref

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

  const handleSubCanvasChange = (data) => {
    dispatch({
      type: 'updateSubCanvasData',
      data: data
    });
  };

  const handleResizeStart = (e) => {
    if (shapeStatus.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = shape.width;
    const startHeight = canvasHeight;
    const scale = shape.page.scaleX || 1;
    
    let rafId = null;
    let currentH = startHeight;
    let currentW = startWidth;
    
    // 开始拖拽时启用错误抑制
    isResizing = true;
    errorSuppressorRef.current = suppressResizeObserverError();
    
    // 捕获指针，避免鼠标移出时中断拖拽
    handleRef.current?.setPointerCapture?.(e.pointerId);

    // 添加 will-change 优化性能
    if (canvasDivRef.current) {
      canvasDivRef.current.style.willChange = 'height';
    }
    
    const handlePointerMove = (moveEvent) => {
      // 取消上一帧的动画，确保每次移动都能响应
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const deltaX = (moveEvent.clientX - startX) / scale;
        const deltaY = (moveEvent.clientY - startY) / scale;
        
        const newWidth = Math.max(300, startWidth + deltaX);
        const newHeight = Math.max(300, startHeight + deltaY);
        
        currentH = newHeight;
        currentW = newWidth;
        currentHeightRef.current = newHeight;
        
        // 只更新 shape.width，不调用 resize（避免触发 ResizeObserver）
        shape.width = newWidth;

        // 只更新 DOM style，不更新 React state（避免触发 React 渲染和 ResizeObserver）
        if (canvasDivRef.current) {
           canvasDivRef.current.style.height = `${newHeight}px`;
        }

        rafId = null;
      });
    };
    
    const handlePointerUp = (upEvent) => {
      // 清理所有事件监听器
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);

      // 释放指针捕获
      handleRef.current?.releasePointerCapture?.(e.pointerId);
      
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
        
        // 统一调用一次 resize，让 Elsa 同步最终尺寸
        shape.resize(currentW, shape.height);
        
        // dispatch 最终配置
        dispatch({
          type: 'updateLoopConfig',
          payload: { canvasHeight: currentHeightRef.current }
        });
      });
    };
    
    // 使用 pointer 事件，确保即使鼠标移出手柄也能持续拖拽
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

        <Form.Item label={t('initialVariables') || "初始变量 (JSON)"}>
          <TextArea
            rows={4}
            value={varsJson}
            onChange={handleVarsChange}
            disabled={shapeStatus.disabled}
            placeholder='{"key": "value"}'
          />
        </Form.Item>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', minHeight: '100%' }}>
      <div className="loop-canvas-container" style={{ flex: 1 }}>
        <div ref={canvasDivRef} style={{ height: canvasHeight, position: 'relative' }}>
          <LoopCanvas 
            shape={shape}
            subCanvasData={subCanvasData} 
            onDataChange={handleSubCanvasChange}
            readOnly={shapeStatus.disabled}
          />
        </div>
      </div>
      
      {/* Resize Handle */}
      {!shapeStatus.disabled && (
        <div
          ref={handleRef}
          onPointerDown={handleResizeStart}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '16px',
            height: '16px',
            cursor: 'nwse-resize',
            background: 'linear-gradient(135deg, transparent 50%, #ccc 50%)',
            zIndex: 10
          }}
          title="拖动调整大小"
        />
      )}

      {/* Resize Preview Overlay removed */}
    </div>
  );
};

LoopWrapper.propTypes = {
  shapeStatus: PropTypes.object,
};

export default LoopWrapper;
