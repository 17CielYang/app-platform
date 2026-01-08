/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

package modelengine.fit.jober.aipp.fitable;

import modelengine.fit.jane.common.entity.OperationContext;
import modelengine.fit.jober.aipp.constants.AippConst;
import modelengine.fit.jober.aipp.dto.AppIdentifier;
import modelengine.fit.jober.aipp.service.AppSyncInvokerService;
import modelengine.fit.jober.aipp.domains.appversion.service.AppVersionService;
import modelengine.fit.jober.aipp.domains.appversion.AppVersion;
import modelengine.fit.jober.aipp.domains.task.AppTask;
import modelengine.fit.jober.aipp.converters.ConverterFactory;
import modelengine.fit.jober.aipp.dto.AippDto;
import modelengine.fit.jober.aipp.dto.AppBuilderAppDto;
import modelengine.fit.jober.aipp.util.ConvertUtils;
import modelengine.fit.waterflow.spi.FlowableService;
import modelengine.fitframework.annotation.Component;
import modelengine.fitframework.annotation.Fit;
import modelengine.fitframework.annotation.Fitable;
import modelengine.fitframework.log.Logger;
import modelengine.fitframework.util.CollectionUtils;
import modelengine.fitframework.util.MapBuilder;
import modelengine.fitframework.util.ObjectUtils;
import modelengine.fitframework.util.StringUtils;
import modelengine.fit.jober.common.FlowDataConstant;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 子工作流循环执行Fitable
 * 用于循环执行子工作流并聚合所有迭代的结果
 *
 * @author 杨诗琪
 * @since 2025/12/10
 */
@Component
public class SubFlowLoopFitable implements FlowableService {
    private static final Logger log = Logger.get(SubFlowLoopFitable.class);
    
    private static final String SUB_FLOW_ID_KEY = "subFlowId";
    private static final String LOOP_COUNT_KEY = "loopCount";
    private static final String INITIAL_VARIABLES_KEY = "initialVariables";
    private static final String LOOP_NODE_INSTANCE_ID_KEY = "loopNodeInstanceId";

    private final AppSyncInvokerService appSyncInvokerService;
    private final AppVersionService appVersionService;
    private final ConverterFactory converterFactory;

    @Fit
    public SubFlowLoopFitable(AppSyncInvokerService appSyncInvokerService,
                              AppVersionService appVersionService,
                              ConverterFactory converterFactory) {
        this.appSyncInvokerService = appSyncInvokerService;
        this.appVersionService = appVersionService;
        this.converterFactory = converterFactory;
    }
    
    /**
     * 存储每个循环节点的迭代结果
     * Key: loopNodeInstanceId, Value: List<Object> 迭代结果列表
     */
    private static final Map<String, List<Object>> loopResultsCache = new ConcurrentHashMap<>();

    @Override
    @SuppressWarnings("unused")
    @Fitable("modelengine.fit.jober.aipp.fitable.SubFlowLoopFitable")
    public List<Map<String, Object>> handleTask(List<Map<String, Object>> contexts) {
        if (CollectionUtils.isEmpty(contexts)) {
            return contexts;
        }

        Map<String, Object> flowData = contexts.get(0);
        log.info("SubFlowLoopFitable flowData keys: {}", flowData.keySet());

        // 获取 businessData
        Map<String, Object> businessData = ObjectUtils.cast(flowData.get("businessData"));
        if (businessData == null) {
            log.error("businessData is null in flowData");
            return contexts;
        }
        log.info("SubFlowLoopFitable businessData keys: {}", businessData.keySet());

        Map<String, Object> inputParams = ObjectUtils.cast(businessData.get(AippConst.BS_INIT_CONTEXT_KEY));
        if (inputParams == null) {
            inputParams = new HashMap<>();
        }
        log.info("SubFlowLoopFitable inputParams: {}", inputParams);

        // 从 inputParams 中获取循环配置
        String subFlowId = ObjectUtils.cast(inputParams.get(SUB_FLOW_ID_KEY));
        if (StringUtils.isBlank(subFlowId)) {
            log.error("Sub flow ID is required for loop node, inputParams={}", inputParams);
            return contexts;
        }
        
        // 获取循环次数（默认1次）
        int loopCount = 1;
        Object loopCountObj = inputParams.get(LOOP_COUNT_KEY);
        if (loopCountObj != null) {
            if (loopCountObj instanceof Number) {
                loopCount = ((Number) loopCountObj).intValue();
            } else {
                try {
                    loopCount = Integer.parseInt(String.valueOf(loopCountObj));
                } catch (NumberFormatException e) {
                    log.warn("Invalid loop count: {}, using default 1", loopCountObj);
                }
            }
        }
        
        // 获取初始变量（从循环节点配置中获取）
        Map<String, Object> initialVariables = new HashMap<>();
        Object initialVarsObj = inputParams.get(INITIAL_VARIABLES_KEY);
        if (initialVarsObj instanceof Map) {
            initialVariables = ObjectUtils.cast(initialVarsObj);
        }
        Map<String, Object> loopInputs = ObjectUtils.cast(inputParams.get("args"));
        if (loopInputs != null && !loopInputs.isEmpty()) {
            initialVariables.putAll(loopInputs);
        }
        String loopKey = ObjectUtils.cast(inputParams.get("loopKey"));

        // ⭐ 将主流程的变量也传递给子流程，让子流程能访问主流程的开始节点变量
        // 从 businessData 中提取主流程的 startNodeInputParams（包含 Question 等开始节点的输入）
        Object startNodeInputParamsObj = businessData.get("startNodeInputParams");
        if (startNodeInputParamsObj instanceof Map) {
            Map<String, Object> startNodeInputParams = ObjectUtils.cast(startNodeInputParamsObj);
            log.info("Found startNodeInputParams from main flow: {}", startNodeInputParams.keySet());
            // 将主流程的开始节点变量合并到 initialVariables 中
            // 注意：initialVariables 的配置优先级更高，会覆盖同名的主流程变量
            for (Map.Entry<String, Object> entry : startNodeInputParams.entrySet()) {
                if (!initialVariables.containsKey(entry.getKey())) {
                    initialVariables.put(entry.getKey(), entry.getValue());
                }
            }
        } else {
            log.info("No startNodeInputParams found in businessData, checking for Question directly");
            // 兜底：直接从 businessData 中获取常见的变量（如 Question）
            Object question = businessData.get("Question");
            if (question != null && !initialVariables.containsKey("Question")) {
                initialVariables.put("Question", question);
                log.info("Added Question from businessData: {}", question);
            }
        }

        // 构造 OperationContext
        // 从 businessData 中提取租户ID和用户ID等信息
        String tenantId = null;
        String userId = null;

        // 尝试从 http_context 字段获取（可能是 OperationContext 对象或 JSON 字符串）
        Object httpContextObj = businessData.get(AippConst.BS_HTTP_CONTEXT_KEY);
        OperationContext operationContext = null;

        if (httpContextObj instanceof OperationContext) {
            // 直接是 OperationContext 对象
            operationContext = (OperationContext) httpContextObj;
            tenantId = operationContext.getTenantId();
            userId = operationContext.getOperator();
            log.info("Got OperationContext from http_context: tenantId={}, userId={}", tenantId, userId);
        } else if (httpContextObj instanceof String) {
            // 是 JSON 字符串，需要解析
            try {
                JSONObject httpContextJson = JSON.parseObject((String) httpContextObj);
                tenantId = httpContextJson.getString("tenantId");
                userId = httpContextJson.getString("operator");

                // 构造 OperationContext
                operationContext = new OperationContext();
                operationContext.setTenantId(tenantId);
                operationContext.setOperator(userId);
                operationContext.setGlobalUserId(httpContextJson.getString("globalUserId"));
                operationContext.setAccount(httpContextJson.getString("account"));
                operationContext.setEmployeeNumber(httpContextJson.getString("employeeNumber"));
                operationContext.setName(httpContextJson.getString("name"));
                operationContext.setOperatorIp(httpContextJson.getString("operatorIp"));
                operationContext.setSourcePlatform(httpContextJson.getString("sourcePlatform"));
                operationContext.setLanguage(httpContextJson.getString("language"));

                log.info("Parsed OperationContext from JSON: tenantId={}, userId={}", tenantId, userId);
            } catch (Exception e) {
                log.error("Failed to parse http_context JSON: {}", httpContextObj, e);
            }
        }

        // 如果还是获取不到 tenantId，尝试从其他字段获取
        if (StringUtils.isBlank(tenantId)) {
            // 尝试从 context 字段解析
            Object contextObj = businessData.get("context");
            if (contextObj instanceof Map) {
                Map<String, Object> contextMap = ObjectUtils.cast(contextObj);
                Object tenantIdObj = contextMap.get("tenantId");
                if (tenantIdObj != null) {
                    tenantId = String.valueOf(tenantIdObj);
                    log.info("Got tenantId from context map: {}", tenantId);
                }
            }

            // 尝试从 userId 字段获取用户ID
            if (StringUtils.isBlank(userId)) {
                Object userIdObj = businessData.get("userId");
                if (userIdObj != null) {
                    userId = String.valueOf(userIdObj);
                    log.info("Got userId from businessData: {}", userId);
                }
            }

            // 如果 operationContext 还是 null，构造一个
            if (operationContext == null) {
                operationContext = new OperationContext();
                operationContext.setTenantId(tenantId);
                operationContext.setOperator(userId);
            } else {
                // 更新已有的 operationContext
                if (StringUtils.isNotBlank(tenantId)) {
                    operationContext.setTenantId(tenantId);
                }
                if (StringUtils.isNotBlank(userId)) {
                    operationContext.setOperator(userId);
                }
            }
        }

        String versionId = ObjectUtils.cast(businessData.get(AippConst.BS_META_VERSION_ID_KEY));

        if (StringUtils.isBlank(tenantId)) {
            log.error("Tenant ID is required after parsing all sources, http_context: {}", httpContextObj);
            return contexts;
        }

        // ⭐ 自动为子流程创建预览版（如果不存在）并获取子流程的 app_suite_id 和 version
        // 如果当前主流程在调试模式下运行，子流程也需要有预览版才能被调用
        String subFlowAppSuiteId;
        String subFlowVersion;
        try {
            log.info("Checking if subflow {} has preview version for loop execution", subFlowId);
            AppVersion subFlowAppVersion = this.appVersionService.retrieval(subFlowId);

            // 获取子流程的 app_suite_id（前端传入的 subFlowId 可能是 app_id）
            subFlowAppSuiteId = subFlowAppVersion.getData().getAppSuiteId();
            log.info("Subflow app_suite_id: {}", subFlowAppSuiteId);

            // 检查子流程是否被修改过（需要更新 flow_definition）
            if (subFlowAppVersion.isUpdated()) {
                log.info("Subflow {} has updates, creating preview version automatically", subFlowId);
                subFlowAppVersion.updateFlows(operationContext);
                log.info("Successfully created preview version for subflow {}", subFlowId);
            } else {
                log.debug("Subflow {} preview version already exists", subFlowId);
            }

            // 获取子流程最新的 AppTask 的 version（这是实际的预览版本号，如 "1.0.0-preview-xxx"）
            AppTask latestTask = subFlowAppVersion.getLatestTask(operationContext);
            subFlowVersion = latestTask.getEntity().getVersion();
            log.info("Using subflow version: {}", subFlowVersion);
        } catch (Exception e) {
            log.error("Failed to prepare subflow {} for loop execution: {}",
                    subFlowId, e.getMessage(), e);
            throw new RuntimeException(
                    "Failed to prepare subflow for loop execution: " + e.getMessage(), e);
        }

        // 生成循环节点实例ID，用于标识本次循环执行
        String parentInstanceId = ObjectUtils.cast(businessData.get(AippConst.BS_AIPP_INST_ID_KEY));
        String loopNodeInstanceId = "loop_" + parentInstanceId + "_" + System.currentTimeMillis();
        
        // 初始化结果列表
        List<Object> iterationResults = new ArrayList<>();
        loopResultsCache.put(loopNodeInstanceId, iterationResults);
        Map<String, Object> loopState = new HashMap<>();
        
        try {
            // 执行循环
            for (int i = 0; i < loopCount; i++) {
                log.info("Loop iteration [index={}, total={}] for subFlow {} (app_suite_id={}), instanceId: {}",
                        i + 1, loopCount, subFlowId, subFlowAppSuiteId, loopNodeInstanceId);
                
                // ⭐ 构建子工作流的输入参数
                // 关键修改：initialVariables 已经包含了主流程的变量（如 Question）
                // 我们需要确保这些变量被传递到子流程的 businessData
                Map<String, Object> subFlowInputParams = new HashMap<>();

                // 先添加循环相关的特殊变量
                subFlowInputParams.put("_loopIndex", i);
                subFlowInputParams.put("_loopCount", loopCount);
                subFlowInputParams.put(LOOP_NODE_INSTANCE_ID_KEY, loopNodeInstanceId);
                if (StringUtils.isNotBlank(parentInstanceId)) {
                    subFlowInputParams.put(AippConst.PARENT_INSTANCE_ID, parentInstanceId);
                }

                // ⭐ 然后添加 initialVariables（包含主流程的变量）
                // 注意：这样循环变量的优先级会高于主流程变量
                subFlowInputParams.putAll(initialVariables);
                if (StringUtils.isNotBlank(loopKey) && initialVariables.containsKey(loopKey)) {
                    Object loopSource = initialVariables.get(loopKey);
                    Object loopValue = null;
                    if (loopSource instanceof List) {
                        List<?> loopList = ObjectUtils.cast(loopSource);
                        if (i >= 0 && i < loopList.size()) {
                            loopValue = loopList.get(i);
                        }
                    } else if (loopSource != null && loopSource.getClass().isArray()) {
                        Object[] loopArray = ObjectUtils.cast(loopSource);
                        if (i >= 0 && i < loopArray.length) {
                            loopValue = loopArray[i];
                        }
                    }
                    if (loopValue != null) {
                        subFlowInputParams.put(loopKey, loopValue);
                    }
                }

                // ⭐ 构建初始化上下文
                // createAippInstance 会将 initContext.get(BS_INIT_CONTEXT_KEY) 作为 businessData
                // 所以我们必须将所有变量都放入 BS_INIT_CONTEXT_KEY
                Map<String, Object> initContext = MapBuilder.<String, Object>get()
                        .put(AippConst.BS_INIT_CONTEXT_KEY, subFlowInputParams)
                        .build();

                log.info("Calling subflow iteration: index=" + (i + 1) + " total=" + loopCount);

                // 调用子工作流，使用子流程的 app_suite_id 和 version
                AppIdentifier appIdentifier = new AppIdentifier(tenantId, subFlowAppSuiteId, subFlowVersion);
                long timeout = 300000; // 5分钟超时

                // 注意：子工作流的执行结果会通过 AippFlowEndCallback 收集到 loopResultsCache 中
                // 这里调用是同步的，会等待子工作流执行完成
                @SuppressWarnings("unused")
                Object iterationResult = appSyncInvokerService.invoke(
                        appIdentifier,
                        initContext,
                        timeout,
                        operationContext
                );

                log.info("Subflow invocation returned, result type: {}",
                        iterationResult == null ? "null" : iterationResult.getClass().getName());

                Map<String, Object> stateUpdate = this.extractLoopState(iterationResult);
                if (stateUpdate != null && !stateUpdate.isEmpty()) {
                    initialVariables.putAll(stateUpdate);
                    loopState.putAll(stateUpdate);
                    log.info("Updated loop state from iteration result, keys: {}", stateUpdate.keySet());
                } else {
                    log.debug("No loop state update found for loop node instance: {}", loopNodeInstanceId);
                }

                log.info("Loop iteration [index={}, total={}] completed for subFlow {} (app_suite_id={})",
                        i + 1, loopCount, subFlowId, subFlowAppSuiteId);
            }
            
            // 从缓存中获取所有迭代结果
            List<Object> finalResults = loopResultsCache.remove(loopNodeInstanceId);
            log.info("Retrieved loop results from cache for instance {}, result count: {}",
                    loopNodeInstanceId, finalResults == null ? 0 : finalResults.size());

            if (finalResults == null || finalResults.isEmpty()) {
                log.warn("No results collected for loop node instance {}, using empty list", loopNodeInstanceId);
                finalResults = new ArrayList<>();
            } else {
                log.info("Final loop results: {}", finalResults);
            }

            // 将结果聚合为数组，放入 businessData
            if (!loopState.isEmpty()) {
                businessData.put("loopState", new HashMap<>(loopState));
                log.info("Final loop state stored in businessData with key 'loopState', keys: {}",
                        loopState.keySet());
            }
            businessData.put("result", finalResults);
            Map<String, Object> outputData = new HashMap<>();
            outputData.put("loopState", loopState);
            outputData.put("result", finalResults);
            this.updateExecuteInfoOutput(flowData, businessData, outputData);
            log.info("Loop node execution completed. Final results added to businessData with key 'result', total iterations: {}",
                    loopCount);

            // 返回更新后的 contexts
            return contexts;
            
        } catch (Exception e) {
            // 清理缓存
            loopResultsCache.remove(loopNodeInstanceId);
            log.error("Error executing loop node: {}", e.getMessage(), e);
            throw new RuntimeException("Loop execution failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * 添加迭代结果到缓存
     * 由 AippFlowEndCallback 调用
     *
     * @param loopNodeInstanceId 循环节点实例ID
     * @param iterationResult 本次迭代的结果
     */
    public static void addIterationResult(String loopNodeInstanceId, Object iterationResult) {
        if (StringUtils.isBlank(loopNodeInstanceId) || iterationResult == null) {
            return;
        }
        loopResultsCache.computeIfAbsent(loopNodeInstanceId, k -> new ArrayList<>())
                .add(iterationResult);
        log.debug("Added iteration result for loop node instance: {}", loopNodeInstanceId);
    }

    private Map<String, Object> extractLoopState(Object iterationResult) {
        if (!(iterationResult instanceof Map)) {
            return null;
        }
        Map<String, Object> resultMap = ObjectUtils.cast(iterationResult);
        Object finalOutputObj = resultMap.get(AippConst.BS_AIPP_FINAL_OUTPUT);
        if (!(finalOutputObj instanceof Map)) {
            throw new IllegalStateException("Loop state missing: finalOutput is not an object.");
        }
        Map<String, Object> finalOutputMap = ObjectUtils.cast(finalOutputObj);
        Object stateObj = finalOutputMap.get("state");
        if (stateObj instanceof Map) {
            return ObjectUtils.cast(stateObj);
        }
        throw new IllegalStateException("Loop state missing: finalOutput.state is required.");
    }

    private void updateExecuteInfoOutput(Map<String, Object> flowData, Map<String, Object> businessData,
            Map<String, Object> outputData) {
        String nodeId = ObjectUtils.cast(businessData.get(AippConst.BS_NODE_ID_KEY));
        if (StringUtils.isBlank(nodeId)) {
            Map<String, Object> contextData = ObjectUtils.cast(flowData.get(FlowDataConstant.CONTEXT_DATA));
            if (contextData != null) {
                nodeId = ObjectUtils.cast(contextData.get(FlowDataConstant.FLOW_NODE_ID));
            }
        }
        if (StringUtils.isBlank(nodeId)) {
            log.warn("Loop node id missing, skip executeInfo output update.");
            return;
        }

        Map<String, Object> internal = ObjectUtils.cast(businessData.get(FlowDataConstant.BUSINESS_DATA_INTERNAL_KEY));
        if (internal == null) {
            internal = new HashMap<>();
            businessData.put(FlowDataConstant.BUSINESS_DATA_INTERNAL_KEY, internal);
        }
        Map<String, Object> executeInfo = ObjectUtils.cast(internal.get(FlowDataConstant.INTERNAL_EXECUTE_INFO_KEY));
        if (executeInfo == null) {
            executeInfo = new HashMap<>();
            internal.put(FlowDataConstant.INTERNAL_EXECUTE_INFO_KEY, executeInfo);
        }

        List<Map<String, Object>> nodeInfos = ObjectUtils.cast(executeInfo.get(nodeId));
        if (nodeInfos == null || nodeInfos.isEmpty()) {
            Map<String, Object> nodeInfo = new HashMap<>();
            nodeInfo.put("output", outputData);
            List<Map<String, Object>> newInfos = new ArrayList<>();
            newInfos.add(nodeInfo);
            executeInfo.put(nodeId, newInfos);
            return;
        }

        Map<String, Object> lastInfo = nodeInfos.get(nodeInfos.size() - 1);
        lastInfo.put("output", outputData);
    }
    
    /**
     * 检查是否为循环节点实例ID
     *
     * @param instanceId 实例ID
     * @return true if it's a loop node instance ID
     */
    @SuppressWarnings("unused")
    public static boolean isLoopNodeInstance(String instanceId) {
        return loopResultsCache.containsKey(instanceId);
    }
}

