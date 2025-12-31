
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 --------------------------------------------------------------------------------------------*/

package modelengine.fit.waterflow.flowsengine.domain.flows.definitions.nodes.jobers;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import modelengine.fit.waterflow.ErrorCodes;
import modelengine.fit.waterflow.exceptions.WaterflowException;
import modelengine.fit.waterflow.flowsengine.domain.flows.context.FlowData;
import modelengine.fitframework.exception.FitException;
import modelengine.fitframework.log.Logger;
import modelengine.fitframework.util.ObjectUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * FlowSubFlowLoopJober
 * 循环子流程Jober
 *
 * @author 皮佳明
 * @since 2025-12-24
 */
public class FlowSubFlowLoopJober extends FlowJober {
    private static final Logger log = Logger.get(FlowSubFlowLoopJober.class);

    private static final String BS_INIT_CONTEXT_KEY = "initContext";

    @Override
    protected List<FlowData> executeJober(List<FlowData> inputs) {
        List<Map<String, Object>> contextData = getInputs(inputs);

        // 将 properties 中的循环配置注入到 inputParams
        if (!contextData.isEmpty()) {
            Map<String, Object> flowData = contextData.get(0);
            // 从 flowData 中获取真正的 businessData
            Map<String, Object> businessData = ObjectUtils.cast(flowData.get("businessData"));
            if (businessData == null) {
                businessData = new HashMap<>();
                flowData.put("businessData", businessData);
            }

            Map<String, Object> inputParams = ObjectUtils.cast(businessData.get(BS_INIT_CONTEXT_KEY));
            if (inputParams == null) {
                inputParams = new HashMap<>();
                businessData.put(BS_INIT_CONTEXT_KEY, inputParams);
            }

            // 从 jober properties 中获取 subFlowId 和 loopConfig
            if (properties.containsKey("subFlowId")) {
                inputParams.put("subFlowId", properties.get("subFlowId"));
                log.info("Injected subFlowId: {}", properties.get("subFlowId"));
            }

            if (properties.containsKey("loopConfig")) {
                // 解析 loopConfig JSON 字符串
                try {
                    JSONObject loopConfigJson = JSON.parseObject(properties.get("loopConfig"));
                    if (loopConfigJson.containsKey("loopCount")) {
                        inputParams.put("loopCount", loopConfigJson.get("loopCount"));
                        log.info("Injected loopCount: {}", loopConfigJson.get("loopCount"));
                    }
                    if (loopConfigJson.containsKey("initialVariables")) {
                        inputParams.put("initialVariables", loopConfigJson.get("initialVariables"));
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse loopConfig: {}", properties.get("loopConfig"), e);
                }
            }
        }

        List<Map<String, Object>> outputEntities = new ArrayList<>();
        for (String fitableId : fitables) {
            try {
                outputEntities = fitableInvoke(contextData, fitableId);
            } catch (FitException ex) {
                log.error("SubFlowLoop jober invoker error, fitable id: {}.", getFitableId(ex));
                log.error("Exception", ex);
                throw new WaterflowException(ex, ErrorCodes.FLOW_GENERAL_JOBER_INVOKE_ERROR);
            }
            log.info("SubFlowLoop invoke success, nodeId: {}, fitable id is {}.", this.nodeMetaId, fitableId);
        }
        return convertToFlowData(outputEntities, inputs.get(0));
    }
}
