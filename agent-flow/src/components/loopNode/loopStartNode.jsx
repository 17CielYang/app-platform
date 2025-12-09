/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {jadeNode} from '@/components/base/jadeNode.jsx';
import {SECTION_TYPE} from '@/common/Consts.js';

/**
 * 循环子流程的开始节点（占位符）
 * 该节点不接受用户配置，由 LoopNode（父节点）控制数据输入
 */
export const loopStartNode = (id, x, y, width, height, parent, drawer) => {
    // 传入 null 作为 drawer，禁用默认抽屉
    const self = jadeNode(id, x, y, width, height, parent, null);
    self.type = 'loopStartNode';
    self.text = '循环开始';
    // self.componentName = 'loopStartComponent'; 
    
    // 覆盖双击事件，禁止打开
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

    return self;
};

