import type { Skill } from '../shared/types';

const BROWSER_SKILLS_KEY = 'agentx.skills';

function skillNameFromFile(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '');
}

export function fileNameFromSkillName(name: string): string {
  return `${name.trim().toLowerCase().replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-')}.md`;
}

export async function listSkills(): Promise<Skill[]> {
  if (!window.electronAPI) {
    return Object.keys(readBrowserSkills()).map(file => ({
      id: file,
      name: skillNameFromFile(file),
      desc: 'Local skill document',
    }));
  }

  const files = await window.electronAPI.readDir('skills');
  return files
    .filter(file => file.endsWith('.md') || file.endsWith('.txt'))
    .map(file => ({
      id: file,
      name: skillNameFromFile(file),
      desc: 'Local skill document',
    }));
}

export async function readSkill(id: string): Promise<string> {
  if (!window.electronAPI) {
    return readBrowserSkills()[id] || '';
  }

  return await window.electronAPI.readFile(`skills/${id}`) || '';
}

export async function writeSkill(id: string, content: string): Promise<boolean> {
  if (!window.electronAPI) {
    const skills = readBrowserSkills();
    skills[id] = content;
    writeBrowserSkills(skills);
    return true;
  }

  return window.electronAPI.writeFile(`skills/${id}`, content);
}

export async function createSkill(name: string): Promise<boolean> {
  const fileName = fileNameFromSkillName(name);
  const content = `# ${name.trim()}\n\nProvide your skill instructions here.`;
  return writeSkill(fileName, content);
}

export async function readActiveSkillTexts(activeSkillIds: string[]): Promise<string[]> {
  const active = new Set(activeSkillIds);
  const skills = await listSkills();
  const texts: string[] = [];

  for (const skill of skills) {
    if (!active.has(skill.id)) continue;
    const text = await readSkill(skill.id);
    if (text) texts.push(text);
  }

  return texts;
}

function readBrowserSkills(): Record<string, string> {
  const stored = window.localStorage.getItem(BROWSER_SKILLS_KEY);
  return stored ? JSON.parse(stored) as Record<string, string> : {};
}

function writeBrowserSkills(skills: Record<string, string>): void {
  window.localStorage.setItem(BROWSER_SKILLS_KEY, JSON.stringify(skills));
}
