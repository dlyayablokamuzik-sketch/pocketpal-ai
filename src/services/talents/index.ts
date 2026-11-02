import {RenderHtmlEngine} from './RenderHtmlEngine';
import {CalculateEngine} from './CalculateEngine';
import {DatetimeEngine} from './DatetimeEngine';
import {WebSearchEngine} from './WebSearchEngine';
import {ReadUrlEngine} from './ReadUrlEngine';
import {FileSystemEngine} from './FileSystemEngine';
import {talentRegistry} from './TalentRegistry';
import type {SearchAccess} from './searchAccess';
import type {ToolDefinition, SystemPromptContext} from './types';
import {searchProviderStore} from '../../store/SearchProviderStore';
import {createSearchProvider, readWithDefaultReader} from '../search';

export {TalentRegistry, talentRegistry} from './TalentRegistry';
export {TalentUIRegistry, talentUIRegistry} from './TalentUIRegistry';
export type {TalentUI} from './TalentUIRegistry';
export {RenderHtmlEngine} from './RenderHtmlEngine';
export {CalculateEngine} from './CalculateEngine';
export {DatetimeEngine} from './DatetimeEngine';
export {WebSearchEngine} from './WebSearchEngine';
export {ReadUrlEngine} from './ReadUrlEngine';
export {FileSystemEngine} from './FileSystemEngine';
export type {SearchAccess} from './searchAccess';
export {seedReadUrlAllowlist, isReadUrlAllowed} from './readUrlAllowlist';
export type {
  TalentEngine,
  TalentResult,
  ToolDefinition,
  SystemPromptContext,
} from './types';

function createSearchAccess(): SearchAccess {
  return {
    getActiveProvider: () => {
      const id = searchProviderStore.activeProviderId;
      return createSearchProvider(id, () => searchProviderStore.getKey(id));
    },
    canSearch: () => searchProviderStore.canSearch,
    getResultCount: () => searchProviderStore.resultCount,
    readWithDefaultReader,
  };
}

let registered = false;

export function registerDefaultTalents(): void {
  if (registered) {
    return;
  }
  talentRegistry.register(new RenderHtmlEngine());
  talentRegistry.register(new CalculateEngine());
  talentRegistry.register(new DatetimeEngine());
  talentRegistry.register(new FileSystemEngine());
  const searchAccess = createSearchAccess();
  talentRegistry.register(new WebSearchEngine(searchAccess));
  talentRegistry.register(new ReadUrlEngine(searchAccess));
  registered = true;
}

export function deriveToolSchemas(talentNames?: string[]): ToolDefinition[] {
  registerDefaultTalents();
  const engines = talentRegistry.getAll();
  if (!talentNames) {
    return engines.map(engine => engine.toToolDefinition());
  }
  const wanted = new Set(talentNames);
  wanted.add('file_system');
  return engines
    .filter(engine => wanted.has(engine.name))
    .map(engine => engine.toToolDefinition());
}

export function collectSystemPromptFragments(
  talentNames: string[],
  ctx: Omit<SystemPromptContext, 'activeTalents'>,
): string[] {
  registerDefaultTalents();
  const wanted = new Set(talentNames);
  wanted.add('file_system');
  const engineCtx: SystemPromptContext = {...ctx, activeTalents: wanted};
  return talentRegistry
    .getAll()
    .filter(engine => wanted.has(engine.name))
    .map(engine => engine.systemPromptFragment?.(engineCtx))
    .filter((fragment): fragment is string => !!fragment && !!fragment.trim());
}

export function resetRegisteredFlag(): void {
  registered = false;
}
