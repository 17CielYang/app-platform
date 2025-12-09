/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import React, {useEffect, useRef, useState} from 'react';
import {jadeFlowGraph} from '@/flow/jadeFlowGraph.js';
import httpUtil from '@/components/util/httpUtil.jsx';
import {JadeFlow} from '../../flow/jadeFlowEntry.jsx';

/**
 * 循环节点内部的子画布组件
 *
 * @param shape 父节点
 * @param subFlowId 子工作流ID
 * @param onSubFlowIdChange 子工作流ID变更回调
 * @param readOnly 是否只读
 */
const LoopCanvas = ({shape, subFlowId, onSubFlowIdChange, readOnly}) => {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [loading, setLoading] = useState(false);
  // 保存定时器引用
  const saveTimerRef = useRef(null);
  // 当前 subFlowId 的引用，用于在闭包中访问最新值
  const currentSubFlowIdRef = useRef(subFlowId);

  // 更新 subFlowId 引用
  useEffect(() => {
    currentSubFlowIdRef.current = subFlowId;
  }, [subFlowId]);

  /**
   * 获取API基础URL
   */
  const getApiBaseUrl = () => {
    const config = shape?.graph?.configs?.find(config => config.node === 'llmNodeState');
    const endpoint = config?.urls?.endpoint || window.location.origin;
    // 从 endpoint 提取基础 URL（去除路径部分）
    try {
      const url = new URL(endpoint);
      return `${url.protocol}//${url.host}`;
    } catch (e) {
      return window.location.origin;
    }
  };

  /**
   * 将后端返回的 appearance 统一转换为对象
   */
  const normalizeAppearance = (rawAppearance) => {
    if (!rawAppearance) {
      return null;
    }
    if (typeof rawAppearance === 'string') {
      try {
        return JSON.parse(rawAppearance);
      } catch (error) {
        console.error('Failed to parse appearance JSON:', error, rawAppearance);
        return null;
      }
    }
    return rawAppearance;
  };

  /**
   * 通过 subFlowId 加载子工作流数据
   */
  const loadSubFlowData = async (flowId) => {
    if (!flowId) {
      return null;
    }
    
    try {
      const tenantId = shape.graph.tenant;
      const baseUrl = getApiBaseUrl();
      const apiUrl = `${baseUrl}/api/jober/v1/api/${tenantId}/app/${flowId}`;
      console.log('[sub-load] start request', {flowId, apiUrl});
      setLoading(true);
      
      return new Promise((resolve, reject) => {
        httpUtil.get(
          apiUrl,
          new Map(),
          (response) => {
            if (response && response.code === 0 && response.data?.flowGraph?.appearance) {
              console.log('[sub-load] raw appearance', {
                flowId,
                type: typeof response.data.flowGraph.appearance,
                length: response.data.flowGraph.appearance?.length,
                preview: (() => {
                  try {
                    return JSON.stringify(response.data.flowGraph.appearance).slice(0, 200);
                  } catch (e) {
                    return '[unserializable]';
                  }
                })(),
              });
              const normalized = normalizeAppearance(response.data.flowGraph.appearance);
              if (!normalized) {
                console.warn('[sub-load] appearance empty after normalization', response.data.flowGraph.appearance);
              }
              console.log('[sub-load] success', {
                flowId,
                hasPages: !!normalized?.pages?.length,
                type: typeof response.data.flowGraph.appearance,
              });
              resolve(normalized);
            } else {
              console.warn('[sub-load] response missing appearance', response);
              resolve(null);
            }
          },
          (error) => {
            console.error('[sub-load] request failed', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('[sub-load] unexpected error', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 创建新的子工作流并返回ID
   */
  const createSubFlow = async () => {
    try {
      setLoading(true);
      const tenantId = shape.graph.tenant;
      const baseUrl = getApiBaseUrl();
      const apiUrl = `${baseUrl}/api/jober/v1/api/${tenantId}/app/df87073b9bc85a48a9b01eccc9afccc3`;
      console.log('[sub-create] start request', {apiUrl, tenantId});
      
      // 创建默认的工作流配置
      const defaultFlowData = {
        type: 'waterFlow',
        name: `循环子工作流_${Date.now()}`,
        description: '循环节点的子工作流',
        app_built_type: 'workflow',
        app_category: 'workflow'
      };
      
      return new Promise((resolve, reject) => {
        httpUtil.post(
          apiUrl,
          defaultFlowData,
          new Map(),
          (response) => {
            if (response && response.code === 0 && response.data) {
              console.log('[sub-create] success', response.data);
              resolve(response.data);
            } else {
              console.error('[sub-create] invalid response', response);
              reject(new Error('Failed to create sub flow'));
            }
          },
          (error) => {
            console.error('[sub-create] request failed', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('[sub-create] unexpected error', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取子工作流信息（用于获取名称）
   */
  const getSubFlowInfo = async (flowId) => {
    if (!flowId) {
      return null;
    }
    
    try {
      const tenantId = shape.graph.tenant;
      const baseUrl = getApiBaseUrl();
      const apiUrl = `${baseUrl}/api/jober/v1/api/${tenantId}/app/${flowId}`;
      console.log('[sub-info] start request', {flowId, apiUrl});
      
      return new Promise((resolve, reject) => {
        httpUtil.get(
          apiUrl,
          new Map(),
          (response) => {
            if (response && response.code === 0 && response.data) {
              console.log('[sub-info] success', {
                flowId,
                hasFlowGraph: !!response.data.flowGraph,
                flowName: response.data.flowGraph?.name || response.data.name,
              });
              resolve(response.data);
            } else {
              console.warn('[sub-info] response missing data', response);
              resolve(null);
            }
          },
          (error) => {
            console.error('[sub-info] request failed', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('[sub-info] unexpected error', error);
      return null;
    }
  };

  /**
   * 保存子工作流数据
   */
  const saveSubFlowData = async (flowId, flowData) => {
    if (!flowId) {
      console.warn('Cannot save: subFlowId is missing');
      return;
    }
    
    try {
      const tenantId = shape.graph.tenant;
      if (!tenantId) {
        console.error('[sub-save] tenantId missing');
        return;
      }
      
      // 先获取子工作流信息，获取 flowGraph 的名称（如果失败则使用默认名称）
      let flowName = `循环子工作流_${flowId.substring(0, 8)}`;
      let latestFlowGraphMeta = null;
      try {
        const flowInfo = await getSubFlowInfo(flowId);
        // flowInfo 是 AppBuilderAppDto，flowGraph.name 才是工作流图的名称
        if (flowInfo?.flowGraph?.name) {
          flowName = flowInfo.flowGraph.name;
        } else if (flowInfo?.name) {
          // 如果没有 flowGraph.name，使用应用名称作为后备
          flowName = flowInfo.name;
        }
        latestFlowGraphMeta = flowInfo?.flowGraph || null;
      } catch (error) {
        console.warn('[sub-save] failed to fetch flow info, fallback to default name', error);
        // 继续使用默认名称
      }
      
      const baseUrl = getApiBaseUrl();
      const apiUrl = `${baseUrl}/api/jober/v1/api/${tenantId}/app/${flowId}/graph`;
      
      // 后端期望的格式：AppBuilderFlowGraphDto
      // 为了与主流程保持一致，尽量携带 flowGraph 的其它元信息（如 id/createBy 等）
      const saveData = {
        ...(latestFlowGraphMeta || {}),
        id: latestFlowGraphMeta?.id || flowId,
        name: flowName,
        appearance: flowData,
      };
      console.log('[sub-save] start request', {
        flowId,
        flowName,
        apiUrl,
        hasPages: !!flowData?.pages?.length,
        appearanceType: typeof flowData,
        payloadHasId: !!saveData.id,
        payloadPreview: (() => {
          try {
            return JSON.stringify({
              ...saveData,
              appearance: undefined,
            }).slice(0, 300);
          } catch (e) {
            return '[unserializable]';
          }
        })(),
      });
      
      return new Promise((resolve, reject) => {
        httpUtil.put(
          apiUrl,
          saveData,
          new Map(),
          (response) => {
            if (response && response.code === 0) {
              console.log('[sub-save] success', {flowId});
              resolve(response);
            } else {
              console.error('[sub-save] invalid response', response);
              reject(new Error(response?.msg || response?.message || 'Failed to save sub flow'));
            }
          },
          (error) => {
            console.error('[sub-save] request failed', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('[sub-save] unexpected error', error);
      throw error;
    }
  };

  // 初始化画布
  useEffect(() => {
    if (!containerRef.current) return;
    if (graphRef.current) return;

    const initGraph = async () => {
      let subFlowData = null;

      // 如果有 subFlowId，通过 ID 加载子工作流数据
      if (subFlowId) {
        try {
          subFlowData = await loadSubFlowData(subFlowId);
        } catch (error) {
          console.error('[sub-init] load failed', error);
          // 如果加载失败，继续使用默认结构
        }
      }

      // 如果没有数据，初始化默认结构或创建新的子工作流
      if (!subFlowData || !subFlowData.pages || subFlowData.pages.length === 0) {
        console.log('[sub-init] using fallback default graph', {
          hasSubFlowData: !!subFlowData,
          hasPages: !!subFlowData?.pages?.length,
        });

        // 如果没有 subFlowId，创建新的子工作流
        if (!subFlowId && !readOnly) {
          try {
            const newFlowInfo = await createSubFlow();
            const newFlowId = newFlowInfo?.id || null;
            subFlowData = newFlowInfo?.flowGraph?.appearance || null;
            if (newFlowId) {
              console.log('[sub-init] created new sub flow id', newFlowId);
              // 更新 subFlowId
              subFlowId = newFlowId;
              currentSubFlowIdRef.current = newFlowId;
              onSubFlowIdChange && onSubFlowIdChange(newFlowId);
            }
          } catch (error) {
            console.error('[sub-init] create sub flow failed', error);
          }
        }
      }

      try {
        const flowAgent = await JadeFlow.edit({
          div: containerRef.current,
          tenant: shape.graph.tenant,
          appId: subFlowId,
          flowConfigData: subFlowData,
          configs: shape.graph.configs,
          i18n: shape.graph.i18n,
          importStatements: [],
          flowType: 'workflow',
          readOnly: readOnly
        });

        graphRef.current = flowAgent.graph;
        if (graphRef.current) {
          graphRef.current.collaboration.mute = true;
        }

        // 转发事件以复用主应用的弹窗
        const forwardEvent = (eventType) => (e) => {
          console.log('[LoopCanvas] forwardEvent debug:', {
            eventType,
            receivedEvent: e,
          });
          
          // 防御性处理：确定 payload
          // 某些版本的 Elsa 或配置可能直接传递 payload 而不是 event 对象
          let payload = e?.value;
          
          if (!payload && e && typeof e === 'object') {
             // 针对不同事件类型检查特定的回调属性
             if (e.onAdd || e.onEdit) {
                 payload = e;
             }
          }

          if (payload) {
            shape.graph.activePage.triggerEvent({
              type: eventType,
              value: payload
            });
          } else {
             console.warn('[LoopCanvas] forwardEvent: invalid event structure', eventType, e);
          }
        };

        if (flowAgent.onAddInputParam) {
          flowAgent.onAddInputParam(forwardEvent('ADD_START_INPUT'));
        }
        if (flowAgent.onEditInputParam) {
          flowAgent.onEditInputParam(forwardEvent('EDIT_START_INPUT'));
        }

        // 如果是新创建的工作流，立即保存一次初始状态
        if (needInitialSave && !readOnly && subFlowId) {
          try {
            console.log('[sub-init] executing initial save for new flow', { subFlowId });
            const page = graphRef.current.activePage;
            
            // 检查是否有开始节点（支持多种类型）
            const startNodes = page.sm.getShapes(s => s.type === 'startNodeStart');
            const loopStartNodes = page.sm.getShapes(s => s.type === 'loopStartNode');
            
            // 如果存在默认的 startNodeStart，将其移除（因为我们要用 loopStartNode）
            if (startNodes.length > 0) {
                console.log('[sub-init] removing default startNodeStart');
                startNodes.forEach(node => node.remove());
            }

            // 如果没有 loopStartNode，创建一个
            if (loopStartNodes.length === 0) {
                console.log('[sub-init] creating loopStartNode');
                // 创建自定义循环开始节点
                page.createShape('loopStartNode', 100, 100);
            }

            const graphData = graphRef.current.serialize();
            await saveSubFlowData(subFlowId, graphData);
          } catch (saveError) {
            console.error('[sub-init] initial save failed', saveError);
          }
        }
      } catch (error) {
        console.error('[sub-init] JadeFlow.edit failed', error);
        return;
      }
      
      // 监听画布变化事件（使用画布内置的 onChangeCallback）
      if (!readOnly && graphRef.current) {
        const handleGraphChange = () => {
          // 防抖保存，避免频繁保存
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
          }
          
          saveTimerRef.current = setTimeout(async () => {
            const flowId = currentSubFlowIdRef.current;
            if (flowId && graphRef.current) {
              try {
                console.log('[sub-change] detected dirty, prepare save', {flowId});
                const graphData = graphRef.current.serialize();
                console.log('[sub-change] serialized data snapshot', {
                  flowId,
                  hasPages: !!graphData?.pages?.length,
                });
                await saveSubFlowData(flowId, graphData);
                console.log('[sub-change] save completed');
              } catch (error) {
                console.error('[sub-change] save failed', error);
              }
            } else {
              if (!flowId) {
                console.warn('[sub-change] missing subFlowId, skip save');
              }
              if (!graphRef.current) {
                console.warn('[sub-change] missing graphRef, skip save');
              }
            }
          }, 2000); // 2秒后保存（与主画布保持一致）
        };
        
        // 监听画布的变化事件（通过 dirtied 回调）
        graphRef.current.onChangeCallback = handleGraphChange;
      }
    };

    initGraph();

    return () => {
      // 清理定时器
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      // 清理画布引用
      if (graphRef.current) {
        graphRef.current.onChangeCallback = null;
        graphRef.current = null;
      }
    };
  }, [subFlowId]); // 当 subFlowId 变化时重新初始化

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
        const newShape = page.createNew(itemType, position.x, position.y, null, null, null, null, null, metaData);
        console.log('[sub-drop] created shape', {
          type: newShape?.type,
          componentName: newShape?.componentName,
          hasDrawer: !!newShape?.drawer,
          hasReactComponent: !!newShape?.drawer?.component,
        });
         
         // 触发变更保存（通过 handleChange）
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
    >
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1000
        }}>
          <span>加载中...</span>
        </div>
      )}
    </div>
  );
};

export default LoopCanvas;
