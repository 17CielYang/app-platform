/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import React, {useEffect, useRef} from 'react';
import {jadeFlowGraph} from '@/flow/jadeFlowGraph.js';

/**
 * 循环节点内部的子画布组件
 *
 * @param shape 父节点
 * @param subCanvasData 子画布数据
 * @param onDataChange 数据变更回调
 * @param readOnly 是否只读
 */
const LoopCanvas = ({shape, subCanvasData, onDataChange, readOnly}) => {
  const containerRef = useRef(null);
  const graphRef = useRef(null);

  // 初始化画布
  useEffect(() => {
    if (!containerRef.current) return;
    if (graphRef.current) return;

    const initGraph = async () => {
      // 创建独立的画布实例
      const graph = jadeFlowGraph(containerRef.current, 'loopSubGraph');
      graphRef.current = graph;
      
      // 复用主画布的配置
      graph.configs = shape.graph.configs;
      graph.tenant = shape.graph.tenant;
      graph.i18n = shape.graph.i18n;
      
      // 由于 jadeFlowGraph.initialize 内部注册了所有插件，我们直接调用
      await graph.initialize();

      // 创建页面
      const page = graph.addPage('loopSubPage');

      // 加载数据或初始化默认数据
      if (subCanvasData && subCanvasData.nodes && subCanvasData.nodes.length > 0) {
        graph.deSerialize({
          pages: [{
            id: 'loopSubPage',
            ...subCanvasData
          }]
        });
      } else {
        // 初始化默认结构：Start -> End
        const start = page.createShape('startNodeStart', 50, 100);
        const end = page.createShape('endNodeEnd', 350, 100);
        const line = page.createNew('jadeEvent', 0, 0);
        page.reset(); // 刷新布局
        line.connect(start.id, 'E', end.id, 'W');
      }
      
      page.fillScreen();
      
      // 监听变化
      if (!readOnly) {
        const handleChange = () => {
            const data = page.serialize();
            onDataChange && onDataChange(data);
        };
        
        // 监听节点添加、删除、移动、连线等事件
        containerRef.current.addEventListener('mouseup', handleChange);
        containerRef.current.addEventListener('keyup', handleChange);
      }
    };

    initGraph();

    return () => {
      // 清理
      if (graphRef.current) {
        // graphRef.current.destroy(); // 如果有销毁方法
        graphRef.current = null;
      }
    };
  }, []);

  // 阻止事件冒泡，防止触发父画布的交互
  useEffect(() => {
    if (!containerRef.current) return;
    
    const stopPropagation = (e) => {
      e.stopPropagation();
    };

    const events = ['mousedown', 'mousemove', 'mouseup', 'click', 'dblclick', 'wheel', 'contextmenu'];
    
    events.forEach(event => {
      containerRef.current.addEventListener(event, stopPropagation);
    });

    return () => {
      if (containerRef.current) {
        events.forEach(event => {
          containerRef.current.removeEventListener(event, stopPropagation);
        });
      }
    };
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 从 dataTransfer 获取主界面拖拽的数据
    // 参见 frontend/src/pages/addFlow/utils/index.ts handleDragBasicNode
    const itemType = e.dataTransfer.getData('itemType');
    const itemMetaDataStr = e.dataTransfer.getData('itemMetaData');
    
    if (itemType && itemMetaDataStr && graphRef.current) {
       try {
         const metaData = JSON.parse(itemMetaDataStr);
         const page = graphRef.current.activePage;
         
         // 计算坐标
         const position = page.calculatePosition(e); 
         
         // 创建节点
         page.createNew(itemType, position.x, position.y, null, null, null, null, null, metaData);
         
         // 触发变更保存
         const data = page.serialize();
         onDataChange && onDataChange(data);
       } catch (error) {
         console.error('Failed to parse dropped item metadata:', error);
       }
    }
  };

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        border: '1px solid #d9d9d9', 
        borderRadius: '4px', 
        overflow: 'hidden',
        position: 'relative' 
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );
};

export default LoopCanvas;
