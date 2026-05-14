import React, { useState, useEffect } from 'react';
import { FolderOpen, FileText, Plus, Check } from 'lucide-react';
import './SkillsManager.css';

interface Skill {
  id: string;
  name: string;
  desc: string;
}

export const SkillsManager: React.FC = () => {
  const [activeSkills, setActiveSkills] = useState<Set<string>>(new Set());
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const files = await window.electronAPI.readDir('skills');
      const loadedSkills: Skill[] = files
        .filter(f => f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.json'))
        .map((f) => {
          return {
            id: f,
            name: f.replace(/\.[^/.]+$/, ""), // remove extension
            desc: 'Local skill document'
          };
        });
      setSkills(loadedSkills);
    } catch (err) {
      console.error("Error loading skills:", err);
    }
  };

  const toggleSkill = (id: string) => {
    setActiveSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleAddSkill = async () => {
    const newName = prompt("Enter new skill name:");
    if (newName) {
      const filename = `${newName.toLowerCase().replace(/\s+/g, '-')}.md`;
      const content = `# ${newName}\n\nProvide your skill instructions here.`;
      await window.electronAPI.writeFile(`skills/${filename}`, content);
      loadSkills();
    }
  };

  return (
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
            <li className="skill-item" style={{opacity: 0.5, cursor: 'default'}}>
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
              onClick={() => toggleSkill(skill.id)}
            >
              <div className="skill-checkbox">
                {activeSkills.has(skill.id) && <Check size={12} strokeWidth={3} />}
              </div>
              <div className="skill-info">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-desc">{skill.desc}</span>
              </div>
              <FileText size={14} className="file-icon" />
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
  );
};
