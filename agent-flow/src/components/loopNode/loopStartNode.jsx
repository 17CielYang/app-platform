/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {jadeNode} from '@/components/base/jadeNode.jsx';
import {SECTION_TYPE} from '@/common/Consts.js';
import {loopStartDrawer} from '@/components/loopNode/loopStartDrawer.jsx';
import {DIRECTION} from '@fit-elsa/elsa';

/**
 * 循环子流程的开始节点
 * 该节点不接受用户配置，由 LoopNode（父节点）控制数据输入
 */
export const loopStartNode = (id, x, y, width, height, parent, drawer) => {
    const self = jadeNode(id, x, y, width, height, parent, drawer ? drawer : loopStartDrawer);
    self.type = 'loopStartNode';
    self.text = ''; // 隐藏文字
    self.componentName = 'loopStartComponent';
    self.hideText = true; // 确保隐藏文字
    self.deletable = false; // 循环开始节点不允许删除
    self.allowConfig = false; // 禁止显示配置面板
    
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
    
    delete self.flowMeta.jober;

    /**
     * 设置W方向没有连接点（循环开始节点只能有输出连接）
     *
     * @override
     */
    const initConnectors = self.initConnectors;
    self.initConnectors = () => {
        initConnectors.apply(self);
        self.connectors.remove(c => c.direction.key === DIRECTION.W.key);
    };

    /**
     * 序列化组件信息
     *
     * @override
     */
    self.serializerJadeConfig = (jadeConfig) => {
        if (!self.flowMeta) {
            self.flowMeta = {};
        }
        self.flowMeta.inputParams = jadeConfig;
    };

    /**
     * 获取用户自定义组件.
     *
     * @return {*}
     */
    self.getComponent = () => {
        if (!self.flowMeta?.inputParams) {
            // 如果 inputParams 未初始化，返回默认配置
            const defaultConfig = self.graph.plugins[self.componentName](null, self);
            return defaultConfig;
        }
        return self.graph.plugins[self.componentName](self.flowMeta.inputParams, self);
    };

    /**
     * 获取组件自定义entity对象
     *
     * @override
     */
    self.getEntity = () => {
        return self.flowMeta;
    };

    /**
     * 覆盖双击事件，禁止打开配置抽屉
     */
    self.onDblClick = () => {
        // 禁止打开抽屉
    };

    /**
     * 获取运行时入参（用于调试面板展示）
     */
    self.getRunInputParams = () => {
        // 这里可以尝试获取父节点的配置，但为了简单起见，返回一个说明
        return {
           info: "Input is managed by parent LoopNode."
        };
    };

    /**
     * 获取测试报告章节
     */
    self.getRunReportSections = () => {
        return [{
            no: "1",
            name: "input",
            type: SECTION_TYPE.DEFAULT,
            data: self.getOutputData(self.input)
        }];
    };

    /**
     * 反序列化.
     *
     * @override
     */
    self.deSerialized = () => {
    };

    return self;
};

