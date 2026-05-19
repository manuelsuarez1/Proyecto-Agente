import React, { useCallback, useEffect, useState } from 'react';
import { Check, Edit2, FolderOpen, Plus, Save, X } from 'lucide-react';
import { loadConfig, updateActiveSkills } from '../services/configService';
import { createSkill, listSkills, readSkill, writeSkill } from '../services/skillsService';
import type { Skill } from '../shared/types';
import './SkillsManager.css';

export const SkillsManager: React.FC = () => {
  const [activeSkills, setActiveSkills] = useState<Set<string>>(new Set());
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillContent, setSkillContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');

  const loadActiveSkills = useCallback(async () => {
    try {
      const config = await loadConfig();
      setActiveSkills(new Set(config.activeSkills || []));
    } catch (err) {
      console.error('Error loading config for active skills:', err);
    }
  }, []);

  const loadAvailableSkills = useCallback(async () => {
    try {
      setSkills(await listSkills());
    } catch (err) {
      console.error('Error loading skills:', err);
    }
  }, []);

  useEffect(() => {
    window.setTimeout(() => {
      void loadAvailableSkills();
      void loadActiveSkills();
    }, 0);

    const handleConfigUpdate = () => { void loadActiveSkills(); };
    window.addEventListener('config-updated', handleConfigUpdate);
    return () => window.removeEventListener('config-updated', handleConfigUpdate);
  }, [loadActiveSkills, loadAvailableSkills]);

  const toggleSkill = async (id: string) => {
    const nextSet = new Set(activeSkills);
    if (nextSet.has(id)) nextSet.delete(id);
    else nextSet.add(id);

    setActiveSkills(nextSet);

    try {
      await updateActiveSkills(Array.from(nextSet));
      window.dispatchEvent(new Event('config-updated'));
    } catch (err) {
      console.error('Error saving active skills to config:', err);
    }
  };

  const handleAddSkill = () => {
    setNewSkillName('');
    setIsAddingSkill(true);
  };

  const handleConfirmAddSkill = async () => {
    const trimmedName = newSkillName.trim();
    if (!trimmedName) return;

    await createSkill(trimmedName);
    await loadAvailableSkills();
    setIsAddingSkill(false);
  };

  const openEditor = async (event: React.MouseEvent, skill: Skill) => {
    event.stopPropagation();
    try {
      setSkillContent(await readSkill(skill.id));
      setEditingSkill(skill);
    } catch (err) {
      console.error('Error opening skill file:', err);
    }
  };

  const handleSaveSkill = async () => {
    if (!editingSkill) return;
    setIsSaving(true);

    try {
      await writeSkill(editingSkill.id, skillContent);
      setEditingSkill(null);
      setSkillContent('');
    } catch (err) {
      console.error('Error saving skill:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <aside className="skills-manager glass">
        <div className="panel-header">
          <FolderOpen size={18} className="panel-icon" />
          <h3>Skills Manager</h3>
        </div>

        <div className="folder-tree">
          <div className="folder-label">
            <FolderOpen size={14} /> /skills/
          </div>

          <ul className="skill-list">
            {skills.length === 0 && (
              <li className="skill-item empty-skill-item">
                <div className="skill-info">
                  <span className="skill-name">No skills found</span>
                  <span className="skill-desc">Click below to add one</span>
                </div>
              </li>
            )}
            {skills.map(skill => (
              <li
                key={skill.id}
                className={`skill-item ${activeSkills.has(skill.id) ? 'active' : ''}`}
                onClick={() => void toggleSkill(skill.id)}
              >
                <div className="skill-checkbox">
                  {activeSkills.has(skill.id) && <Check size={12} strokeWidth={3} />}
                </div>
                <div className="skill-info">
                  <span className="skill-name">{skill.name}</span>
                  <span className="skill-desc">{skill.desc}</span>
                </div>
                <button className="btn-icon edit-skill-btn" onClick={event => void openEditor(event, skill)} title="Edit Skill">
                  <Edit2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel-footer">
          <button className="btn btn-ghost add-skill-btn" onClick={handleAddSkill}>
            <Plus size={16} /> Add Skill Document
          </button>
        </div>
      </aside>

      {editingSkill && (
        <div className="skill-modal-overlay">
          <div className="skill-modal glass">
            <div className="skill-modal-header">
              <h3>Editing: {editingSkill.name}</h3>
              <button className="btn-icon" onClick={() => setEditingSkill(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="skill-modal-body">
              <textarea
                className="input-field skill-textarea"
                value={skillContent}
                onChange={event => setSkillContent(event.target.value)}
                placeholder="Write your markdown skill instructions here..."
              />
            </div>
            <div className="skill-modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditingSkill(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void handleSaveSkill()} disabled={isSaving}>
                {isSaving ? 'Saving...' : <><Save size={16} className="skill-save-icon" /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddingSkill && (
        <div className="skill-modal-overlay">
          <div className="skill-modal glass">
            <div className="skill-modal-header">
              <h3>Add New Skill</h3>
              <button className="btn-icon" onClick={() => setIsAddingSkill(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="skill-modal-body add-skill-body">
              <input
                type="text"
                className="input-field"
                value={newSkillName}
                onChange={event => setNewSkillName(event.target.value)}
                placeholder="Enter new skill name (e.g. Code Reviewer)"
                autoFocus
                onKeyDown={event => {
                  if (event.key === 'Enter') void handleConfirmAddSkill();
                }}
              />
            </div>
            <div className="skill-modal-footer">
              <button className="btn btn-ghost" onClick={() => setIsAddingSkill(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void handleConfirmAddSkill()} disabled={!newSkillName.trim()}>
                <Plus size={16} className="skill-save-icon" /> Add Skill
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
