/**
 * 兼容入口：转发到 runtime（支持请求级 Key 覆盖）
 */
export {
  getLLMProvider,
  getLLMConfigs,
  updateLLMConfigs,
  resolveLLMConfig,
  type ClientLLMOverride,
} from './runtime';
