/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {jadeNode} from '@/components/base/jadeNode.jsx';
import {DIRECTION} from '@fit-elsa/elsa';
import {SECTION_TYPE} from '@/common/Consts.js';
import {loopEndNodeDrawer} from '@/components/loopNode/loopEndNodeDrawer.jsx';
import {EndNodeConnectorValidator, FormValidator} from '@/components/base/validator.js';
import {SYSTEM_EXTRA_KEY, VALID_FORM_KEY} from '@/components/end/EndConst.js';

/**
 * 循环结束节点shape
 * 基于结束节点改造，禁止输出结果到对话
 *
 @override
 */
export const loopEndNodeEnd = (id, x, y, width, height, parent, drawer) => {
    const self = jadeNode(id, x, y, width, height, parent, drawer ? drawer : loopEndNodeDrawer);
    self.type = 'loopEndNodeEnd';
    self.text = '循环结束';
    self.componentName = 'loopEndComponent';
    self.hideText = true; // Canvas 上隐藏文字，但 Drawer 中的 Header 仍可显示 shape.text

    // 设置为圆形节点
    const circleSize = 60; // 圆形直径
    self.width = circleSize;
    self.height = circleSize;
    self.autoWidth = false;
    self.autoHeight = false;
    self.borderRadius = circleSize / 2; // 设置为圆形
    self.cornerRadius = circleSize / 2;
    self.backColor = '#ffffff';
    self.focusBackColor = '#ffffff';
    self.borderColor = 'rgba(28,31,35,.08)';
    self.mouseInBorderColor = '#047bfc';
    self.focusBorderColor = '#047bfc';

    self.flowMeta = {
        triggerMode: 'auto',
        callback: {
            type: 'general_callback',
            name: '通知回调',
            fitables: ['modelengine.fit.jober.aipp.fitable.AippFlowEndCallback'],
            converter: {
                type: 'mapping_converter',
            },
        }
    };

    /**
     * @override
     */
    const remove = self.remove;
    self.remove = (source) => {
        // 循环结束节点可以删除
        return remove.apply(self, [source]);
    };

    /**
     * 设置E方向没有连接点
     *
     * @override
     */
    const initConnectors = self.initConnectors;
    self.initConnectors = () => {
        initConnectors.apply(self);
        self.connectors.remove(c => c.direction.key === DIRECTION.E.key);
    };

    /**
     * 序列化组件信息
     *
     * @override
     */
    self.serializerJadeConfig = (jadeConfig) => {
        if (!self.flowMeta) {
            self.flowMeta = {
                triggerMode: 'auto',
                callback: {
                    type: 'general_callback',
                    name: '通知回调',
                    fitables: ['modelengine.fit.jober.aipp.fitable.AippFlowEndCallback'],
                    converter: {
                        type: 'mapping_converter',
                    },
                }
            };
        }
        if (!self.flowMeta.callback) {
            self.flowMeta.callback = {
                type: 'general_callback',
                name: '通知回调',
                fitables: ['modelengine.fit.jober.aipp.fitable.AippFlowEndCallback'],
                converter: {
                    type: 'mapping_converter',
                },
            };
        }
        if (!self.flowMeta.callback.converter) {
            self.flowMeta.callback.converter = {
                type: 'mapping_converter',
            };
        }
        self.flowMeta.callback.converter.entity = jadeConfig;
    };

    /**
     * 反序列化.
     *
     * @override
     */
    self.deSerialized = () => {
    };

    /**
     * 获取用户自定义组件.
     *
     * @override
     */
    self.getComponent = () => {
        if (!self.flowMeta?.callback?.converter?.entity) {
            // 如果 entity 未初始化，返回默认配置
            const defaultConfig = self.graph.plugins[self.componentName](null, self);
            return defaultConfig;
        }
        return self.graph.plugins[self.componentName](self.flowMeta.callback.converter.entity, self);
    };

    /**
     * 获取组件自定义entity对象
     *
     * @override
     */
    self.getEntity = () => {
        if (!self.flowMeta?.callback?.converter?.entity) {
            // 如果 entity 未初始化，返回 null
            return null;
        }
        return self.flowMeta.callback.converter.entity;
    };

    /**
     * 循环结束节点的测试报告章节
     */
    self.getRunReportSections = () => {
        return [{
            no: '1',
            name: 'output',
            type: SECTION_TYPE.DEFAULT,
            data: self.getOutputData(Object.keys(self.input)
              .filter(key => !VALID_FORM_KEY.has(key))
              .filter(key => !SYSTEM_EXTRA_KEY.has(key))
              .reduce((acc, key) => {
                  acc[key] = self.input[key];
                  return acc;
              }, {})),
        }];
    };

    /**
     * @override
     */
    const created = self.created;
    self.created = () => {
        created.apply(self);
    };

    /**
     * 校验节点状态是否正常.
     *
     * @param linkNodeSet 链路中的节点列表的Set
     * @return Promise 校验结果
     */
    self.validate = (linkNodeSet) => {
        const validators = [new FormValidator(self)];
        if (linkNodeSet.has(self.id)) {
            validators.push(new EndNodeConnectorValidator(self));
        }
        return self.runValidators(validators);
    };

    return self;
};
