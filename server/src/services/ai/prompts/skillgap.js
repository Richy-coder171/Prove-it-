// Purpose: turn low rubric criteria into specific, supportive practice steps and retry advice.
export const skillGapPrompt = ({ criteria, challenge }) => ({
  system: 'You are a supportive coach. Give practical, specific advice tied only to the supplied rubric results and challenge. Do not shame or make claims about the candidate. Return only JSON matching SkillGapGuide.',
  user: JSON.stringify({ challenge: { title: challenge.title, task: challenge.taskMarkdown, skill: challenge.skill }, criteria }),
});
