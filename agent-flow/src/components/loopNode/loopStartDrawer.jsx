/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {jadeNodeDrawer} from '@/components/base/jadeNodeDrawer.jsx';
import React from 'react';

/**
 * 循环开始节点绘制器
 *
 * @override
 */
export const loopStartDrawer = (shape, div, x, y) => {
    const self = jadeNodeDrawer(shape, div, x, y);
    self.type = "loopStartDrawer";

    /**
     * @override
     * 隐藏 header 图标
     */
    self.getHeaderIcon = () => {
        return null;
    };

    /**
     * @override
     * 隐藏 header type 图标
     */
    self.getHeaderTypeIcon = () => {
        return null;
    };

    /**
     * @override
     * 隐藏 header 组件
     */
    self.getHeaderComponent = (data, shapeStatus) => {
        return null;
    };

    /**
     * @override
     * 隐藏 footer 组件
     */
    self.getFooterComponent = () => {
        return null;
    };

    /**
     * @override
     */
    self.getToolMenus = () => {
        // 循环开始节点不允许删除和重命名
        return [];
    };

    return self;
};

