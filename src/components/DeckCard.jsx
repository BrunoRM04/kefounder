import React from 'react';
import { Info, MapPin, Sparkles } from 'lucide-react';
import { availabilityLabel, compensationLabel, goalLabel, initials, projectCompensationLabel, projectRoleLabel, stageLabel, workModeLabel } from '../lib/format.js';
import { imageSrc } from '../lib/media.js';
import { Pill, ProjectLogo, cx } from './ui.jsx';

function MatchBadge({ match }) {
  if (match?.score == null) return null;
  return <span className="dc-match"><Sparkles size={13} fill="currentColor" /> {match.score}% <small>match</small></span>;
}

function InfoButton({ label, onInfo }) {
  if (!onInfo) return null;
  return <button type="button" className="dc-info" aria-label={label} onClick={onInfo}><Info size={19} /></button>;
}

export function PersonCardView({ item, onInfo }) {
  return (
    <div className="dc">
      <div className="dc-photo" style={{ backgroundColor: item.accent, backgroundImage: item.photo ? `url("${imageSrc(item.photo, 900)}")` : undefined }}>
        {!item.photo && <span className="dc-initials">{initials(item.name)}</span>}
        <div className="dc-shade" />
        <div className="dc-top">
          <Pill tone="glass"><i className="dc-live" /> {item.boosted ? 'Destacado' : 'Persona'}</Pill>
          <MatchBadge match={item.match} />
        </div>
        <div className="dc-bottom">
          <div className="dc-name">
            <h2>{item.name}{item.age ? <span>, {item.age}</span> : null}</h2>
            {item.location && <p><MapPin size={14} /> {item.location}</p>}
          </div>
          <InfoButton label={`Ver perfil completo de ${item.name}`} onInfo={onInfo} />
        </div>
      </div>
      <div className="dc-body">
        <div className="dc-role">
          <strong>{item.headline || 'Construyendo algo nuevo'}</strong>
          <span className={cx('dc-status', item.online && 'is-online')}><i /> {item.online ? 'En línea' : 'Disponible'}</span>
        </div>
        <div className="dc-seek">
          <span className="dc-seek-icon">✳</span>
          <div>
            <small>Busca</small>
            <strong>{item.lookingFor || goalLabel(item.goal) || 'Conocer personas para construir'}</strong>
          </div>
        </div>
        <div className="dc-facts">
          {item.availability && <span>⏳ {availabilityLabel(item.availability)}</span>}
          {item.compensation && <span>✦ {compensationLabel(item.compensation)}</span>}
        </div>
      </div>
    </div>
  );
}

export function ProjectCardView({ item, onInfo }) {
  const roles = (item.rolesNeeded || []).map((r) => projectRoleLabel(r.role));
  return (
    <div className="dc dc-project-card">
      <div className="dc-photo" style={{ backgroundColor: item.accent, backgroundImage: item.cover ? `url("${imageSrc(item.cover, 900)}")` : undefined }}>
        {!item.cover && <span className="dc-cover-spark">✳</span>}
        <div className="dc-shade" />
        <div className="dc-top">
          <Pill tone="glass"><i className="dc-live" /> {item.stage ? `Etapa: ${stageLabel(item.stage)}` : 'Proyecto'}</Pill>
          <MatchBadge match={item.match} />
        </div>
        <div className="dc-bottom">
          <div className="dc-name dc-name-project">
            <ProjectLogo project={item} size={46} />
            <div>
              <h2>{item.name}</h2>
              <p><MapPin size={14} /> {item.workMode === 'remote' ? 'Remoto' : item.location || workModeLabel(item.workMode)}</p>
            </div>
          </div>
          <InfoButton label={`Ver proyecto ${item.name}`} onInfo={onInfo} />
        </div>
      </div>
      <div className="dc-body">
        <p className="dc-tagline">{item.tagline}</p>
        <div className="dc-seek">
          <span className="dc-seek-icon">✳</span>
          <div>
            <small>Buscamos</small>
            <strong>{roles.length ? roles.join(' · ') : 'Personas con ganas de construir'}</strong>
          </div>
        </div>
        <div className="dc-facts">
          {item.dedication && <span>⏳ {availabilityLabel(item.dedication)}</span>}
          {item.compensation && <span>✦ {projectCompensationLabel(item.compensation)}</span>}
        </div>
      </div>
    </div>
  );
}

export function DeckCardView({ item, onInfo }) {
  return item.type === 'project' ? <ProjectCardView item={item} onInfo={onInfo} /> : <PersonCardView item={item} onInfo={onInfo} />;
}
