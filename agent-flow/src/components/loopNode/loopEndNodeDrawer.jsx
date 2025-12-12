/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {jadeNodeDrawer} from "@/components/base/jadeNodeDrawer.jsx";
import FlagIcon from "../asserts/icon-flag.svg?react";
import {Header} from '@/components/Header.jsx';
import {Footer} from '@/components/Footer.jsx';
import React, {useLayoutEffect, useRef, useState} from 'react';

const LoopEndHeader = ({shape, data, shapeStatus}) => {
    const containerRef = useRef(null);
    const [isInDrawer, setIsInDrawer] = useState(false);

    // 使用 useLayoutEffect 同步检查，避免闪烁
    useLayoutEffect(() => {
        if (containerRef.current) {
            // 检查是否在 .sticky-header 内（Drawer 的 header 区域）
            const stickyHeader = containerRef.current.closest('.sticky-header');
            setIsInDrawer(!!stickyHeader);
        }
    });

    // 第一次渲染时，先渲染一个容器来检查位置
    return (
        <div ref={containerRef}>
            {isInDrawer ? <Header shape={shape} data={data} shapeStatus={shapeStatus}/> : null}
        </div>
    );
};

const LoopEndFooter = ({shape}) => {
    const containerRef = useRef(null);
    const [isInDrawer, setIsInDrawer] = useState(false);

    useLayoutEffect(() => {
        if (containerRef.current) {
            const drawer = containerRef.current.closest('.jade-form-drawer');
            setIsInDrawer(!!drawer);
        }
    });

    return (
        <div ref={containerRef}>
            {isInDrawer ? <Footer shape={shape}/> : null}
        </div>
    );
};

/**
 * 循环结束节点绘制器
 *
 * @override
 */
export const loopEndNodeDrawer = (shape, div, x, y) => {
    const self = jadeNodeDrawer(shape, div, x, y);
    self.type = "loopEndNodeDrawer";

    /**
     * @override
     */
    self.getHeaderIcon = () => {
        return (<>
            <FlagIcon className="jade-node-custom-header-icon" style={{ width: '24px', height: '24px', color: '#047bfc' }}/>
        </>);
    };

    self.getHeaderTypeIcon = () => null;
    
    self.getHeaderComponent = (data, shapeStatus) => {
        return <LoopEndHeader shape={shape} data={data} shapeStatus={shapeStatus}/>;
    };

    self.getFooterComponent = () => {
        return <LoopEndFooter shape={shape}/>;
    };

    /**
     * @override
     */
    self.getToolMenus = () => {
        let toolMenus = [{
            key: 'copy', label: 'copy', action: () => {
                shape.duplicate();
            },
        }, {
            key: 'rename', label: 'rename', action: (setEdit) => {
                setEdit(true);
            },
        }, {
            key: 'delete', label: 'delete', action: () => {
                shape.remove();
            },
        }];
        return toolMenus;
    };

    return self;
};
