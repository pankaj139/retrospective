import React, { useMemo, useState } from 'react';
import { useRetro } from '../context/RetroContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { playClick, playSuccess } from '../utils/sound';
import { Award, ArrowLeft, Trophy, Activity, LayoutGrid, FileText, CheckCircle, Star, Share2, Copy, Download, X } from 'lucide-react';
import { HEALTH_METRICS, AI_ADOPTION_QUESTIONS } from '../utils/mockData';

export const ScorePhase: React.FC = () => {
  const {
    currentRetro,
    teams,
    selectedTeamId,
    submitRetroFeedback,
    setRetroScore,
    completeRetro,
    prevPhase,
    currentUserMemberId
  } = useRetro();
  const team = teams.find(t => t.id === selectedTeamId) || teams[0];
  const isFacilitator = !currentRetro?.createdBy || currentRetro.createdBy === currentUserMemberId;

  const [score, setScore] = useState(5);
  const [myFeedbackDraft, setMyFeedbackDraft] = useState<string | null>(null);
  const [facilitatorFeedbackDraft, setFacilitatorFeedbackDraft] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'markdown' | 'json'>('markdown');
  const [copied, setCopied] = useState(false);
  const [copiedRichText, setCopiedRichText] = useState(false);

  const feedbackMap = useMemo(() => currentRetro?.memberRetroFeedback ?? {}, [currentRetro?.memberRetroFeedback]);
  const joinedMemberIds = useMemo(
    () => currentRetro?.joinedMemberIds?.filter(memberId => team.members.some(member => member.id === memberId)) ?? [],
    [currentRetro?.joinedMemberIds, team.members]
  );
  const joinedMembers = useMemo(
    () => team.members.filter(member => joinedMemberIds.includes(member.id)),
    [team.members, joinedMemberIds]
  );
  const mySavedFeedback = feedbackMap[currentUserMemberId] || '';
  const myFeedback = myFeedbackDraft ?? mySavedFeedback;
  const facilitatorFeedback = facilitatorFeedbackDraft ?? (currentRetro?.retroFeedback || '');
  const hasSubmittedMyFeedback = Boolean(mySavedFeedback.trim());
  const pendingMembers = useMemo(
    () => joinedMembers.filter(member => !feedbackMap[member.id]?.trim()),
    [joinedMembers, feedbackMap]
  );
  const pendingMemberNames = pendingMembers.map(member => member.name);
  const allFeedbackSubmitted = joinedMembers.length > 0 && pendingMembers.length === 0;

  const handleRatingSelect = (rate: number) => {
    playClick();
    setScore(rate);
  };

  const handleSubmitMyFeedback = async () => {
    if (!currentUserMemberId || !myFeedback.trim()) return;

    playClick();
    await submitRetroFeedback(currentUserMemberId, myFeedback);
    setMyFeedbackDraft(myFeedback);
  };

  const handleFinish = async () => {
    if (!isFacilitator) return;

    playSuccess();
    setArchiveError('');
    await setRetroScore(score, facilitatorFeedback);
    await completeRetro();
    setCompleted(true);
  };

  // Find game high-scorer
  const getGameWinner = () => {
    if (!currentRetro) return null;
    let maxScore = -1;
    let winnerId = '';
    
    Object.entries(currentRetro.gameScores).forEach(([mId, pts]) => {
      if (pts > maxScore) {
        maxScore = pts;
        winnerId = mId;
      }
    });

    if (maxScore <= 0) return null;
    
    const member = team.members.find(m => m.id === winnerId);
    return member ? { name: member.name, emoji: member.emoji, score: maxScore } : null;
  };

  const winner = getGameWinner();

  // Find Star of the Release winner
  const getStarWinner = () => {
    if (!currentRetro || !currentRetro.starOfReleaseVotes) return null;
    const votes = currentRetro.starOfReleaseVotes;
    const tally: Record<string, number> = {};
    Object.values(votes).forEach(nomineeId => {
      tally[nomineeId] = (tally[nomineeId] || 0) + 1;
    });
    
    let maxVotes = 0;
    let winnerId = '';
    Object.entries(tally).forEach(([mId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winnerId = mId;
      }
    });

    if (maxVotes <= 0) return null;
    
    const member = team.members.find(m => m.id === winnerId);
    return member ? { name: member.name, emoji: member.emoji, count: maxVotes } : null;
  };

  const starWinner = getStarWinner();

  const formatRetroDate = (dateValue?: string) => {
    if (!dateValue) return 'N/A';
    const parsedDate = new Date(dateValue);
    return Number.isNaN(parsedDate.getTime()) ? 'N/A' : parsedDate.toLocaleDateString();
  };

  const generateMarkdownExport = () => {
    if (!currentRetro) return '';
    
    // 1. Team & General Info
    let md = `# ${currentRetro.retroName || 'DAKI Retrospective Session Summary'}\n`;
    md += `- **Date**: ${formatRetroDate(currentRetro.date)}\n`;
    md += `- **Team**: ${team?.name || 'Unknown Team'}\n`;
    md += `- **Session ID**: ${currentRetro.id}\n`;
    const joinedNames = (currentRetro.joinedMemberIds || [])
      .map(id => {
        const m = team.members.find(member => member.id === id);
        return m ? `${m.emoji} ${m.name}` : null;
      })
      .filter(Boolean)
      .join(', ');
    md += `- **Participants**: ${joinedNames || 'None'}\n\n`;
    
    // 2. Health Check Averages
    md += `## 1. Participant Morale & Team Health\n\n`;
    const healthScores = currentRetro.healthCheckScores || {};
    md += `### Core Health Metrics\n`;
    HEALTH_METRICS.forEach(metric => {
      const scores = Object.values(healthScores)
        .map(memberScores => memberScores[metric.id])
        .filter(score => typeof score === 'number');
      const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
      md += `- **${metric.name}**: ${avg}/5 (${metric.description})\n`;
    });
    md += `\n`;

    // AI Adoption Averages
    const aiScores = currentRetro.aiAdoptionScores || {};
    md += `### AI Adoption & Integration Metrics\n`;
    AI_ADOPTION_QUESTIONS.forEach(metric => {
      const scores = Object.values(aiScores)
        .map(memberScores => memberScores[metric.id])
        .filter(score => typeof score === 'number');
      const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
      md += `- **${metric.name}**: ${avg}/5 (${metric.description})\n`;
    });
    md += `\n`;

    // 3. Icebreaker Responses
    md += `## 2. Icebreaker Responses\n`;
    const icebreakerQuestion = currentRetro.icebreakerQuestion || 'No icebreaker question selected';
    md += `- **Question**: "${icebreakerQuestion}"\n`;
    const responses = currentRetro.icebreakerAnswers || {};
    if (Object.keys(responses).length > 0) {
      Object.entries(responses).forEach(([memberId, answer]) => {
        const member = team.members.find(m => m.id === memberId);
        if (member && answer.trim()) {
          md += `  - **${member.emoji} ${member.name}**: "${answer}"\n`;
        }
      });
    } else {
      md += `  - *No responses recorded.*\n`;
    }
    md += `\n`;

    // 4. Warmup Game Scoreboard
    md += `## 3. Warmup Game Scoreboard\n`;
    const gameScores = currentRetro.gameScores || {};
    if (Object.keys(gameScores).length > 0) {
      const sortedScores = Object.entries(gameScores)
        .map(([memberId, pts]) => ({
          member: team.members.find(m => m.id === memberId),
          score: pts
        }))
        .sort((a, b) => b.score - a.score);
      
      sortedScores.forEach(({ member, score: pts }, idx) => {
        if (member) {
          const medal = idx === 0 ? '🏆 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : '• ';
          md += `  - ${medal}${member.emoji} ${member.name}: ${pts} pts\n`;
        }
      });
    } else {
      md += `  - *No scores recorded.*\n`;
    }
    md += `\n`;

    // 5. Star of the Release (Kudos)
    md += `## 4. Star of the Release (Kudos)\n`;
    const sorVotes = currentRetro.starOfReleaseVotes || {};
    if (Object.keys(sorVotes).length > 0) {
      Object.entries(sorVotes).forEach(([voterId, nomineeId]) => {
        const voter = team.members.find(m => m.id === voterId);
        const nominee = team.members.find(m => m.id === nomineeId);
        if (voter && nominee) {
          md += `  - **${voter.emoji} ${voter.name}** nominated **${nominee.emoji} ${nominee.name}**\n`;
        }
      });
    } else {
      md += `  - *No nominations cast.*\n`;
    }
    md += `\n`;

    // 6. DAKI Board
    md += `## 5. DAKI Board (Drop, Add, Keep, Improve)\n\n`;
    const dakiCards = currentRetro.dakiCards || [];
    const columns = {
      drop: 'DROP (Things to stop doing)',
      add: 'ADD (New ideas to start)',
      keep: 'KEEP (Good practices to continue)',
      improve: 'IMPROVE (Things to refine/optimize)'
    };
    
    Object.entries(columns).forEach(([colKey, colName]) => {
      md += `### ${colName}\n`;
      const colCards = dakiCards.filter(c => c.column === colKey);
      if (colCards.length > 0) {
        colCards.forEach(card => {
          md += `- "${card.content}" - by **${card.authorEmoji} ${card.authorName}** (${card.votes} votes) ${card.category ? `[${card.category}]` : ''}\n`;
        });
      } else {
        md += `- *No cards in this column.*\n`;
      }
      md += `\n`;
    });

    // 7. Committed Action Items
    md += `## 6. Committed Action Items\n`;
    const actionItems = currentRetro.actionItems || [];
    if (actionItems.length > 0) {
      actionItems.forEach(item => {
        const assignee = team.members.find(m => m.id === item.assigneeId);
        const assigneeName = assignee ? `${assignee.emoji} ${assignee.name}` : 'Unassigned';
        md += `- [ ] **${item.description}**\n`;
        md += `  - **Assignee**: ${assigneeName}\n`;
        md += `  - **Due Date**: ${item.dueDate}\n`;
        md += `  - **Status**: ${item.status}\n`;
      });
    } else {
      md += `- *No action items created in this session.*\n`;
    }
    md += `\n`;

    // 8. Retro Feedback & Value Rating
    md += `## 7. Retro Feedback & Value Rating\n`;
    md += `- **Value Score**: ${currentRetro.retroScore || score}/5\n`;
    const finalFeedback = currentRetro.retroFeedback || facilitatorFeedback;
    if (finalFeedback) {
      md += `- **Facilitator Summary**: "${finalFeedback}"\n`;
    }
    
    const memberFeedback = currentRetro.memberRetroFeedback || {};
    if (Object.keys(memberFeedback).length > 0) {
      md += `- **Team Feedback**:\n`;
      Object.entries(memberFeedback).forEach(([mId, fbText]) => {
        const member = team.members.find(m => m.id === mId);
        if (member && fbText.trim()) {
          md += `  - **${member.emoji} ${member.name}**: "${fbText}"\n`;
        }
      });
    }

    return md;
  };

  const handleCopy = () => {
    playClick();
    const text = activeTab === 'markdown' ? generateMarkdownExport() : JSON.stringify(currentRetro, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    playClick();
    const text = activeTab === 'markdown' ? generateMarkdownExport() : JSON.stringify(currentRetro, null, 2);
    const filename = activeTab === 'markdown' ? `retro-summary-${currentRetro?.id || 'export'}.md` : `retro-data-${currentRetro?.id || 'export'}.json`;
    const mime = activeTab === 'markdown' ? 'text/markdown' : 'application/json';
    
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    playClick();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const htmlContent = `
      <html>
        <head>
          <title>${team?.name || 'Team'} - Retro Summary - ${formatRetroDate(currentRetro?.date)}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              line-height: 1.6;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            h1 {
              color: #1e1b4b;
              font-size: 28px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            h2 {
              color: #312e81;
              font-size: 20px;
              margin-top: 32px;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 6px;
            }
            h3 {
              color: #4338ca;
              font-size: 16px;
              margin-top: 20px;
            }
            ul {
              padding-left: 20px;
            }
            li {
              margin-bottom: 8px;
            }
            .meta-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 24px;
            }
            .meta-box p {
              margin: 4px 0;
              font-size: 14px;
            }
            .metric-bar-container {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 8px;
            }
            .metric-name {
              width: 250px;
              font-size: 14px;
              font-weight: 600;
            }
            .metric-bar-outer {
              flex-grow: 1;
              background-color: #e2e8f0;
              height: 10px;
              border-radius: 5px;
              overflow: hidden;
            }
            .metric-bar-inner {
              background-color: #4f46e5;
              height: 100%;
            }
            .metric-val {
              font-size: 14px;
              font-weight: 700;
              width: 40px;
              text-align: right;
            }
            .daki-column-section {
              margin-bottom: 16px;
              background-color: #fafafa;
              border-left: 4px solid #cbd5e1;
              padding: 12px 16px;
              border-radius: 0 8px 8px 0;
            }
            .daki-column-section.drop { border-left-color: #ef4444; background-color: #fef2f2; }
            .daki-column-section.add { border-left-color: #10b981; background-color: #ecfdf5; }
            .daki-column-section.keep { border-left-color: #f59e0b; background-color: #fffbeb; }
            .daki-column-section.improve { border-left-color: #06b6d4; background-color: #ecfeff; }
            .daki-title {
              font-weight: 700;
              margin-bottom: 8px;
              font-size: 15px;
            }
            .daki-title.drop { color: #991b1b; }
            .daki-title.add { color: #065f46; }
            .daki-title.keep { color: #92400e; }
            .daki-title.improve { color: #155e75; }
            .card-content {
              font-size: 14px;
              margin-bottom: 6px;
              padding-bottom: 6px;
              border-bottom: 1px dashed #e2e8f0;
            }
            .card-content:last-child {
              border-bottom: none;
              margin-bottom: 0;
              padding-bottom: 0;
            }
            .action-item-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            .action-item-table th, .action-item-table td {
              border: 1px solid #e2e8f0;
              padding: 10px;
              text-align: left;
              font-size: 14px;
            }
            .action-item-table th {
              background-color: #f8fafc;
              font-weight: 600;
            }
            .action-checkbox {
              display: inline-block;
              width: 14px;
              height: 14px;
              border: 1px solid #94a3b8;
              margin-right: 8px;
              vertical-align: middle;
            }
            .no-print-btn {
              padding: 10px 16px;
              background-color: #4f46e5;
              color: white;
              border: none;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.1);
              transition: background-color 0.2s;
            }
            .no-print-btn:hover {
              background-color: #4338ca;
            }
            @media print {
              .no-print-header {
                display: none;
              }
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
            <span style="font-size: 14px; color: #64748b; font-weight: 500;">📄 Print Preview (Select "Save as PDF" in destination to export as PDF)</span>
            <button onclick="window.print()" class="no-print-btn">
              Print / Save as PDF
            </button>
          </div>
          
          <h1 style="margin: 0; border: none; padding: 0;">${currentRetro?.retroName || 'Retrospective Session Summary'}</h1>
          <div style="margin-top: 15px; margin-bottom: 25px; height: 2px; background: linear-gradient(to right, #4f46e5, #06b6d4);"></div>
          
          <div class="meta-box">
            <p><strong>Date:</strong> ${formatRetroDate(currentRetro?.date)}</p>
            <p><strong>Team:</strong> ${team?.name || 'Unknown'}</p>
            <p><strong>Session ID:</strong> ${currentRetro?.id || 'N/A'}</p>
            <p><strong>Participants:</strong> ${(currentRetro?.joinedMemberIds || []).map(id => {
              const m = team.members.find(member => member.id === id);
              return m ? `${m.emoji} ${m.name}` : '';
            }).filter(Boolean).join(', ') || 'None'}</p>
            <p><strong>Overall Value Rating:</strong> ${currentRetro?.retroScore || score}/5</p>
          </div>

          <h2>1. Participant Morale & Team Health</h2>
          
          <h3>Core Health Metrics</h3>
          ${HEALTH_METRICS.map(metric => {
            const scores = Object.values(currentRetro?.healthCheckScores || {})
              .map(memberScores => memberScores[metric.id])
              .filter(s => typeof s === 'number');
            const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            const pct = (avg / 5) * 100;
            return `
              <div class="metric-bar-container">
                <div class="metric-name">${metric.name}</div>
                <div class="metric-bar-outer">
                  <div class="metric-bar-inner" style="width: ${pct}%"></div>
                </div>
                <div class="metric-val">${avg > 0 ? avg.toFixed(1) : 'N/A'}/5</div>
              </div>
            `;
          }).join('')}

          <h3 style="margin-top: 24px;">AI Adoption & Integration Metrics</h3>
          ${AI_ADOPTION_QUESTIONS.map(metric => {
            const scores = Object.values(currentRetro?.aiAdoptionScores || {})
              .map(memberScores => memberScores[metric.id])
              .filter(s => typeof s === 'number');
            const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            const pct = (avg / 5) * 100;
            return `
              <div class="metric-bar-container">
                <div class="metric-name">${metric.name}</div>
                <div class="metric-bar-outer">
                  <div class="metric-bar-inner" style="width: ${pct}%"></div>
                </div>
                <div class="metric-val">${avg > 0 ? avg.toFixed(1) : 'N/A'}/5</div>
              </div>
            `;
          }).join('')}

          <h2>2. Icebreaker Responses</h2>
          <p><strong>Question:</strong> "${currentRetro?.icebreakerQuestion || 'No icebreaker question selected'}"</p>
          <ul>
            ${Object.entries(currentRetro?.icebreakerAnswers || {}).map(([memberId, answer]) => {
              const member = team.members.find(m => m.id === memberId);
              if (member && answer.trim()) {
                return `<li><strong>${member.emoji} ${member.name}:</strong> "${answer}"</li>`;
              }
              return '';
            }).join('') || '<li><em>No icebreaker answers logged.</em></li>'}
          </ul>

          <h2>3. Warmup Game Scoreboard</h2>
          <ul>
            ${Object.entries(currentRetro?.gameScores || {}).map(([memberId, pts]) => {
              const member = team.members.find(m => m.id === memberId);
              if (member) {
                return `<li><strong>${member.emoji} ${member.name}:</strong> ${pts} pts</li>`;
              }
              return '';
            }).join('') || '<li><em>No game scores.</em></li>'}
          </ul>

          <h2>4. Star of the Release Kudos</h2>
          <ul>
            ${Object.entries(currentRetro?.starOfReleaseVotes || {}).map(([voterId, nomineeId]) => {
              const voter = team.members.find(m => m.id === voterId);
              const nominee = team.members.find(m => m.id === nomineeId);
              if (voter && nominee) {
                return `<li><strong>${voter.emoji} ${voter.name}</strong> nominated <strong>${nominee.emoji} ${nominee.name}</strong></li>`;
              }
              return '';
            }).join('') || '<li><em>No kudos recorded.</em></li>'}
          </ul>

          <h2>5. DAKI Board</h2>
          
          <div class="daki-column-section drop">
            <div class="daki-title drop">DROP (Things to stop doing)</div>
            ${currentRetro?.dakiCards.filter(c => c.column === 'drop').map(card => `
              <div class="card-content">
                "${card.content}" - <em>by ${card.authorEmoji} ${card.authorName} (${card.votes} votes) ${card.category ? `[${card.category}]` : ''}</em>
              </div>
            `).join('') || '<em>No cards</em>'}
          </div>

          <div class="daki-column-section add">
            <div class="daki-title add">ADD (New ideas to start)</div>
            ${currentRetro?.dakiCards.filter(c => c.column === 'add').map(card => `
              <div class="card-content">
                "${card.content}" - <em>by ${card.authorEmoji} ${card.authorName} (${card.votes} votes) ${card.category ? `[${card.category}]` : ''}</em>
              </div>
            `).join('') || '<em>No cards</em>'}
          </div>

          <div class="daki-column-section keep">
            <div class="daki-title keep">KEEP (Good practices to continue)</div>
            ${currentRetro?.dakiCards.filter(c => c.column === 'keep').map(card => `
              <div class="card-content">
                "${card.content}" - <em>by ${card.authorEmoji} ${card.authorName} (${card.votes} votes) ${card.category ? `[${card.category}]` : ''}</em>
              </div>
            `).join('') || '<em>No cards</em>'}
          </div>

          <div class="daki-column-section improve">
            <div class="daki-title improve">IMPROVE (Things to refine)</div>
            ${currentRetro?.dakiCards.filter(c => c.column === 'improve').map(card => `
              <div class="card-content">
                "${card.content}" - <em>by ${card.authorEmoji} ${card.authorName} (${card.votes} votes) ${card.category ? `[${card.category}]` : ''}</em>
              </div>
            `).join('') || '<em>No cards</em>'}
          </div>

          <h2>6. Committed Action Items</h2>
          <table class="action-item-table">
            <thead>
              <tr>
                <th style="width: 55%">Description</th>
                <th style="width: 25%">Assignee</th>
                <th style="width: 20%">Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${currentRetro?.actionItems.map(item => {
                const assignee = team.members.find(m => m.id === item.assigneeId);
                const assigneeName = assignee ? `${assignee.emoji} ${assignee.name}` : 'Unassigned';
                return `
                  <tr>
                    <td><span class="action-checkbox"></span> <strong>${item.description}</strong></td>
                    <td>${assigneeName}</td>
                    <td>${item.dueDate}</td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="3"><em>No action items committed.</em></td></tr>'}
            </tbody>
          </table>

          <h2>7. Final Retro Feedback & Summaries</h2>
          ${currentRetro?.retroFeedback || facilitatorFeedback ? `<p><strong>Facilitator Summary:</strong> "${currentRetro?.retroFeedback || facilitatorFeedback}"</p>` : ''}
          
          <ul>
            ${Object.entries(currentRetro?.memberRetroFeedback || {}).map(([mId, text]) => {
              const member = team.members.find(m => m.id === mId);
              if (member && text.trim()) {
                return `<li><strong>${member.emoji} ${member.name}:</strong> "${text}"</li>`;
              }
              return '';
            }).join('')}
          </ul>

          <script>
            // Auto trigger print setup
            window.addEventListener('DOMContentLoaded', () => {
              setTimeout(() => { window.print(); }, 500);
            });
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleCopyRichText = async () => {
    playClick();
    const htmlContent = `
      <h2>${currentRetro?.retroName || 'DAKI Retrospective Session Summary'}</h2>
      <p><strong>Date:</strong> ${formatRetroDate(currentRetro?.date)}<br>
      <strong>Team:</strong> ${team?.name || 'Unknown'}<br>
      <strong>Session ID:</strong> ${currentRetro?.id || 'N/A'}<br>
      <strong>Participants:</strong> ${(currentRetro?.joinedMemberIds || []).map(id => {
        const m = team.members.find(member => member.id === id);
        return m ? `${m.emoji} ${m.name}` : '';
      }).filter(Boolean).join(', ') || 'None'}</p>

      <h3>1. Participant Morale & Team Health</h3>
      <ul>
        ${HEALTH_METRICS.map(metric => {
          const scores = Object.values(currentRetro?.healthCheckScores || {})
            .map(memberScores => memberScores[metric.id])
            .filter(s => typeof s === 'number');
          const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
          return `<li><strong>${metric.name}:</strong> ${avg}/5</li>`;
        }).join('')}
      </ul>

      <h3>AI Adoption Metrics</h3>
      <ul>
        ${AI_ADOPTION_QUESTIONS.map(metric => {
          const scores = Object.values(currentRetro?.aiAdoptionScores || {})
            .map(memberScores => memberScores[metric.id])
            .filter(s => typeof s === 'number');
          const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
          return `<li><strong>${metric.name}:</strong> ${avg}/5</li>`;
        }).join('')}
      </ul>

      <h3>2. Icebreaker Responses</h3>
      <p><strong>Question:</strong> "${currentRetro?.icebreakerQuestion || 'No icebreaker question selected'}"</p>
      <ul>
        ${Object.entries(currentRetro?.icebreakerAnswers || {}).map(([memberId, answer]) => {
          const member = team.members.find(m => m.id === memberId);
          if (member && answer.trim()) {
            return `<li><strong>${member.emoji} ${member.name}:</strong> "${answer}"</li>`;
          }
          return '';
        }).join('')}
      </ul>

      <h3>3. Warmup Game Scoreboard</h3>
      <ul>
        ${Object.entries(currentRetro?.gameScores || {}).map(([memberId, pts]) => {
          const member = team.members.find(m => m.id === memberId);
          if (member) {
            return `<li><strong>${member.emoji} ${member.name}:</strong> ${pts} pts</li>`;
          }
          return '';
        }).join('')}
      </ul>

      <h3>4. Star of the Release Kudos</h3>
      <ul>
        ${Object.entries(currentRetro?.starOfReleaseVotes || {}).map(([voterId, nomineeId]) => {
          const voter = team.members.find(m => m.id === voterId);
          const nominee = team.members.find(m => m.id === nomineeId);
          if (voter && nominee) {
            return `<li><strong>${voter.emoji} ${voter.name}</strong> nominated <strong>${nominee.emoji} ${nominee.name}</strong></li>`;
          }
          return '';
        }).join('')}
      </ul>

      <h3>5. DAKI Board</h3>
      <h4>DROP (Things to stop doing)</h4>
      <ul>
        ${currentRetro?.dakiCards.filter(c => c.column === 'drop').map(card => `
          <li>"${card.content}" - <em>by ${card.authorEmoji} ${card.authorName} (${card.votes} votes) ${card.category ? `[${card.category}]` : ''}</em></li>
        `).join('') || '<li><em>No cards</em></li>'}
      </ul>

      <h4>ADD (New ideas to start)</h4>
      <ul>
        ${currentRetro?.dakiCards.filter(c => c.column === 'add').map(card => `
          <li>"${card.content}" - <em>by ${card.authorEmoji} ${card.authorName} (${card.votes} votes) ${card.category ? `[${card.category}]` : ''}</em></li>
        `).join('') || '<li><em>No cards</em></li>'}
      </ul>

      <h4>KEEP (Good practices to continue)</h4>
      <ul>
        ${currentRetro?.dakiCards.filter(c => c.column === 'keep').map(card => `
          <li>"${card.content}" - <em>by ${card.authorEmoji} ${card.authorName} (${card.votes} votes) ${card.category ? `[${card.category}]` : ''}</em></li>
        `).join('') || '<li><em>No cards</em></li>'}
      </ul>

      <h4>IMPROVE (Things to refine/optimize)</h4>
      <ul>
        ${currentRetro?.dakiCards.filter(c => c.column === 'improve').map(card => `
          <li>"${card.content}" - <em>by ${card.authorEmoji} ${card.authorName} (${card.votes} votes) ${card.category ? `[${card.category}]` : ''}</em></li>
        `).join('') || '<li><em>No cards</em></li>'}
      </ul>

      <h3>6. Committed Action Items</h3>
      <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th>Description</th>
            <th>Assignee</th>
            <th>Due Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${currentRetro?.actionItems.map(item => {
            const assignee = team.members.find(m => m.id === item.assigneeId);
            const assigneeName = assignee ? `${assignee.emoji} ${assignee.name}` : 'Unassigned';
            return `
              <tr>
                <td><strong>${item.description}</strong></td>
                <td>${assigneeName}</td>
                <td>${item.dueDate}</td>
                <td>${item.status}</td>
              </tr>
            `;
          }).join('') || '<tr><td colspan="4">No action items committed.</td></tr>'}
        </tbody>
      </table>

      <h3>7. Final Retro Feedback</h3>
      <p><strong>Value Score:</strong> ${currentRetro?.retroScore || score}/5</p>
      ${currentRetro?.retroFeedback || facilitatorFeedback ? `<p><strong>Facilitator Summary:</strong> "${currentRetro?.retroFeedback || facilitatorFeedback}"</p>` : ''}
      <ul>
        ${Object.entries(currentRetro?.memberRetroFeedback || {}).map(([mId, text]) => {
          const member = team.members.find(m => m.id === mId);
          if (member && text.trim()) {
            return `<li><strong>${member.emoji} ${member.name}:</strong> "${text}"</li>`;
          }
          return '';
        }).join('')}
      </ul>
    `;

    try {
      const blobHTML = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([generateMarkdownExport()], { type: 'text/plain' });
      const data = [new ClipboardItem({
        'text/html': blobHTML,
        'text/plain': blobText
      })];
      await navigator.clipboard.write(data);
      setCopiedRichText(true);
      setTimeout(() => setCopiedRichText(false), 2000);
    } catch {
      navigator.clipboard.writeText(generateMarkdownExport());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (completed) {
    return (
      <div className="w-full max-w-xl mx-auto flex flex-col gap-6 items-center justify-center text-center py-16 animate-fade-in">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <CheckCircle className="w-10 h-10" />
        </div>
        
        <div>
          <h1 className="title-large text-3xl font-extrabold text-slate-100 mb-2">Retrospective Archived!</h1>
          <p className="subtitle text-sm max-w-sm">
            Excellent collaboration today. The session recap has been logged into team logs, and pending actions will carry forward.
          </p>
        </div>

        <div className="flex gap-3 mt-4">
          <Button 
            variant="primary" 
            size="lg" 
            onClick={() => { playClick(); window.location.reload(); }}
            glow
            className="px-10"
          >
            Return to Setup
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => { playClick(); setShowExportModal(true); }}
            icon={<Share2 className="w-4 h-4" />}
          >
            Export Retro Data
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="title-large flex items-center gap-3">
            <Award className="w-9 h-9 text-indigo-400" />
            Rate Retrospective
          </h1>
          <p className="subtitle">Rate the effectiveness of today's meeting and save the session logs.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="glass"
            size="sm"
            onClick={() => { playClick(); setShowExportModal(true); }}
            icon={<Share2 className="w-4 h-4" />}
          >
            Export for LLM
          </Button>
          {isFacilitator ? (
            <>
              <Button variant="outline" size="sm" onClick={prevPhase} icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={handleFinish}
                icon={<CheckCircle className="w-4 h-4" />}
                glow
              >
                Archive Session
              </Button>
            </>
          ) : (
            <span className="text-xs text-slate-400 italic bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
              Waiting for facilitator...
            </span>
          )}
        </div>
      </div>

      {isFacilitator && !allFeedbackSubmitted && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-300 flex flex-col gap-1.5">
          <span>
            Waiting on {pendingMembers.length} joined teammate{pendingMembers.length === 1 ? '' : 's'} to submit final feedback.
          </span>
          {pendingMemberNames.length > 0 && (
            <span className="text-[11px] text-amber-200/90">
              Pending: {pendingMemberNames.join(', ')}
            </span>
          )}
        </div>
      )}

      {archiveError && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 px-4 py-2.5 text-xs text-rose-300">
          {archiveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Rating selectors */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card padding="lg" className="flex flex-col gap-5 justify-center">
            <h2 className="text-lg font-bold border-b border-white/5 pb-3 text-center">
              Session ROI / Value
            </h2>
            
            <div className="flex justify-center items-center gap-3 py-4">
              {[1, 2, 3, 4, 5].map(rate => {
                const isSelected = rate <= score;
                return (
                  <button
                    key={rate}
                    onClick={() => handleRatingSelect(rate)}
                    className={`focus:outline-none transition-all duration-200 active:scale-95
                      ${isSelected ? 'text-amber-400 hover:text-amber-300' : 'text-slate-700 hover:text-slate-600'}
                    `}
                  >
                    <Star className="w-10 h-10" fill={isSelected ? "currentColor" : "none"} />
                  </button>
                );
              })}
            </div>

            <div className="text-center text-xs font-semibold text-amber-400 font-mono">
              {score === 1 && '😭 Wasted Time / Frustrated'}
              {score === 2 && '😕 Not useful / Repetitive'}
              {score === 3 && '😐 Average meeting quality'}
              {score === 4 && '🙂 Good discussions & outcomes'}
              {score === 5 && '🤩 Extremely valuable / Peak alignment'}
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                My Final Feedback {hasSubmittedMyFeedback && <span className="text-emerald-400 normal-case">(Submitted)</span>}
              </label>
              <textarea
                placeholder="Share your final retro feedback. You can update this any time before archive."
                rows={3}
                value={myFeedback}
                onChange={e => setMyFeedbackDraft(e.target.value)}
                className="form-input text-xs leading-relaxed py-2.5"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitMyFeedback}
                disabled={!myFeedback.trim()}
                icon={<CheckCircle className="w-4 h-4" />}
              >
                {hasSubmittedMyFeedback ? 'Update My Feedback' : 'Submit My Feedback'}
              </Button>
            </div>

            {isFacilitator && (
              <div className="flex flex-col gap-1.5 mt-2 border-t border-white/5 pt-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Facilitator Session Summary (Archive View)
                </label>
                <textarea
                  placeholder="Optional summary shown in archive details."
                  rows={3}
                  value={facilitatorFeedback}
                  onChange={e => setFacilitatorFeedbackDraft(e.target.value)}
                  className="form-input text-xs leading-relaxed py-2.5"
                />
              </div>
            )}

            <div className="text-[11px] text-slate-400 border-t border-white/5 pt-3">
              Feedback submitted: <span className="font-semibold text-emerald-400">{joinedMembers.length - pendingMembers.length}</span> / {joinedMembers.length}
            </div>
          </Card>
        </div>

        {/* Dashboard Recap */}
        <div className="lg:col-span-3">
          <Card padding="lg" className="flex flex-col gap-6 h-full">
            <h2 className="text-lg font-bold border-b border-white/5 pb-3">
              Retro Session Recap Summary
            </h2>

            {/* Star of the Release Spotlight Section */}
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-indigo-500/5 border border-amber-500/20 rounded-xl flex items-center gap-4 shadow-md">
              <div className="relative w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center shrink-0">
                {starWinner ? (
                  <>
                    <span className="text-2xl">{starWinner.emoji}</span>
                    <Trophy className="w-5 h-5 text-amber-400 absolute -bottom-1 -right-1 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)] animate-pulse" />
                  </>
                ) : (
                  <Star className="w-6 h-6 text-amber-500/40" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-current" /> Star of the Release Spotlight
                </span>
                {starWinner ? (
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-100 mt-0.5">
                      {starWinner.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Celebrated by the team with {starWinner.count} nomination{starWinner.count !== 1 ? 's' : ''}! 🎉
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-0.5 italic">
                    No nominations cast in this session.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
              {/* Game Winner */}
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
                <Trophy className="w-8 h-8 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Game Champion</span>
                  {winner ? (
                    <p className="text-xs font-bold text-slate-100 truncate">
                      {winner.emoji} {winner.name} ({winner.score} pts)
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-slate-500">No score recorded</p>
                  )}
                </div>
              </div>

              {/* Health Metrics Count */}
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
                <Activity className="w-8 h-8 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Health Averages</span>
                  <p className="text-xs font-bold text-slate-100">
                    Checked ({Object.keys(currentRetro?.healthCheckScores || {}).length} Dimensions)
                  </p>
                </div>
              </div>

              {/* Daki Count */}
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
                <LayoutGrid className="w-8 h-8 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Feedback Card Count</span>
                  <p className="text-xs font-bold text-slate-100">
                    {currentRetro?.dakiCards.length || 0} DAKI items processed
                  </p>
                </div>
              </div>

              {/* New Actions */}
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
                <FileText className="w-8 h-8 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">New Commitments</span>
                  <p className="text-xs font-bold text-slate-100">
                    {currentRetro?.actionItems.length || 0} Action Items created
                  </p>
                </div>
              </div>
            </div>

            {currentRetro?.actionItems && currentRetro.actionItems.length > 0 && (
              <div className="mt-2 border-t border-white/5 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Committed Actions:</h3>
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {currentRetro.actionItems.map(item => (
                    <div key={item.id} className="text-xs text-slate-300 flex justify-between gap-4 py-1 border-b border-white/5 last:border-0">
                      <span className="truncate">• {item.description}</span>
                      <span className="font-semibold text-[10px] text-slate-400 shrink-0 font-mono">Due: {item.dueDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {showExportModal && (
        <div className="skip-confirm-backdrop animate-fade-in" onClick={() => setShowExportModal(false)}>
          <div className="skip-confirm-card w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-100">Export Retro Data</h3>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 text-left">
              Copy or download your team's retrospective data to share it with your preferred LLM to generate insights, action logs, or next-step summaries.
            </p>

            <div className="flex gap-2 border-b border-white/5 pb-2 text-xs">
              <button
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${activeTab === 'markdown' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => setActiveTab('markdown')}
              >
                Markdown Format
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${activeTab === 'json' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => setActiveTab('json')}
              >
                JSON Format
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950/60 rounded-xl border border-white/5 p-4 max-h-[300px] font-mono text-[11px] leading-normal text-slate-300 text-left select-all whitespace-pre-wrap">
              {activeTab === 'markdown' ? generateMarkdownExport() : JSON.stringify(currentRetro, null, 2)}
            </div>

            <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-3.5 flex flex-col gap-1.5 text-xs text-left">
              <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">💡 LLM Prompt Idea</span>
              <p className="text-[11px] text-slate-300 italic">
                "Based on the attached retro session log, please analyze our team health averages, identify the key themes on the DAKI board, and draft a clean summary highlighting team achievements, major friction points to resolve, and assignments for the committed action items."
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportModal(false)}
              >
                Close
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrint}
                icon={<FileText className="w-4 h-4" />}
              >
                Save as PDF
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                icon={<Download className="w-4 h-4" />}
              >
                Download File
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopyRichText}
                icon={copiedRichText ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                glow={!copiedRichText}
              >
                {copiedRichText ? 'Copied Rich Text!' : 'Copy for Google Docs'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopy}
                icon={copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                glow={!copied}
              >
                {copied ? 'Copied!' : 'Copy Raw Text'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
