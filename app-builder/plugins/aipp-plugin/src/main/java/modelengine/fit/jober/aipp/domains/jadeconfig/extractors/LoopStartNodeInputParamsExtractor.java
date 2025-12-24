/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

package modelengine.fit.jober.aipp.domains.jadeconfig.extractors;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;

/**
 * 循环开始节点入参提取器.
 * 循环节点的 inputParams 是一个对象，包含 inputParams 和 outputParams 数组.
 *
 * @author 皮佳明
 * @since 2025-12-23
 */
public class LoopStartNodeInputParamsExtractor implements InputParamsExtractor {
    @Override
    public JSONArray extract(JSONObject shape) {
        JSONObject flowMeta = shape.getJSONObject("flowMeta");
        if (flowMeta == null) {
            return null;
        }

        JSONObject inputParamsObj = flowMeta.getJSONObject("inputParams");
        if (inputParamsObj == null) {
            return null;
        }

        return inputParamsObj.getJSONArray("inputParams");
    }
}
