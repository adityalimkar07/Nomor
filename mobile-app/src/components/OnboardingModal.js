import React from 'react';
import { CAREER_TRACKS } from '../config/appConstants';

export const OnboardingModal = ({ showOnboarding, selectTrack }) => {
  if (!showOnboarding) return null;

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-modal">
        <h1>Welcome to Nomor! 🎯</h1>
        <p>Choose your career track to get personalized challenges and motivation</p>
        
        <div className="tracks-grid">
          {Object.values(CAREER_TRACKS).map((track) => (
            <div
              key={track.id}
              className="track-card"
              onClick={() => selectTrack(track.id)}
            >
              <div className="track-icon">{track.icon}</div>
              <h3>{track.name}</h3>
              <p className="track-desc">{track.description}</p>
              <div className="track-skills">
                {track.skills.slice(0, 3).map((skill, i) => (
                  <span key={i} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
