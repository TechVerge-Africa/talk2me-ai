export interface GreetingInfo {
  greeting: string;
  subtitle: string;
  emoji: string;
}

/**
 * Generates a dynamic, emotionally diverse greeting based on:
 * 1. Time since last visit (e.g. "It's been a while!" if > 48h away)
 * 2. Rapid return frequency (e.g. "Back so soon!" if < 3h)
 * 3. Time of day (morning, afternoon, evening, night owl) with warm emotional depth
 */
export function getSmartGreeting(userName: string): GreetingInfo {
  if (typeof window === 'undefined') {
    return {
      greeting: `Welcome back, ${userName}!`,
      subtitle: 'Ready to connect and communicate without barriers?',
      emoji: '✨'
    };
  }

  let diffHours = 0;
  let lastVisitStr: string | null = null;
  try {
    lastVisitStr = localStorage.getItem('t2_last_visit_time');
    const now = Date.now();
    localStorage.setItem('t2_last_visit_time', String(now));

    if (lastVisitStr) {
      diffHours = (now - Number(lastVisitStr)) / (1000 * 60 * 60);
    }
  } catch {
    // localStorage disabled fallback
  }

  const date = new Date();
  const hour = date.getHours();

  // 1. User returning after a long time (> 48 hours)
  if (lastVisitStr && diffHours > 48) {
    const longAbsentGreetings = [
      {
        greeting: `It's been a while, ${userName}!`,
        subtitle: `We've missed you! Ready to jump back into seamlessly inclusive meetings?`,
        emoji: '🌟'
      },
      {
        greeting: `Long time no see, ${userName}!`,
        subtitle: `Welcome back! Great to have you back in your communication hub.`,
        emoji: '🤗'
      },
      {
        greeting: `Welcome back, ${userName}!`,
        subtitle: `Hope you've been doing well. Let's catch up on your latest sessions and notes.`,
        emoji: '✨'
      }
    ];
    return longAbsentGreetings[Math.floor(Math.random() * longAbsentGreetings.length)];
  }

  // 2. Rapid revisit (< 3 hours)
  if (lastVisitStr && diffHours < 3 && diffHours > 0.05) {
    const quickReturnGreetings = [
      {
        greeting: `Back so soon, ${userName}?`,
        subtitle: `Let's keep the momentum going! Ready for your next conversation?`,
        emoji: '🚀'
      },
      {
        greeting: `Great to see you again, ${userName}!`,
        subtitle: `Picked right up where you left off. Everything is primed and ready.`,
        emoji: '⚡'
      },
      {
        greeting: `On a roll today, ${userName}!`,
        subtitle: `Your accessibility engine is running smooth. What's next on the agenda?`,
        emoji: '🔥'
      }
    ];
    return quickReturnGreetings[Math.floor(Math.random() * quickReturnGreetings.length)];
  }

  // 3. Diverse time-of-day greetings
  if (hour >= 5 && hour < 12) {
    const morningGreetings = [
      {
        greeting: `Good Morning, ${userName}!`,
        subtitle: `Fresh start to the day! Let's make every conversation count today.`,
        emoji: '🌅'
      },
      {
        greeting: `Rise and shine, ${userName}!`,
        subtitle: `Ready to connect with clarity and empathy this morning?`,
        emoji: '☀️'
      },
      {
        greeting: `Morning vibes, ${userName}!`,
        subtitle: `Your AI caption and translation engine is primed for the day ahead.`,
        emoji: '☕'
      }
    ];
    return morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
  } else if (hour >= 12 && hour < 17) {
    const afternoonGreetings = [
      {
        greeting: `Good Afternoon, ${userName}!`,
        subtitle: `Hope your day is going productively! Ready for afternoon collaboration?`,
        emoji: '🌤️'
      },
      {
        greeting: `Hey there, ${userName}!`,
        subtitle: `Powered through the morning? Let me know how I can assist your afternoon workflow.`,
        emoji: '💪'
      },
      {
        greeting: `Afternoon, ${userName}!`,
        subtitle: `Keep the energy high. Your inclusive workspace is ready for your next session.`,
        emoji: '⚡'
      }
    ];
    return afternoonGreetings[Math.floor(Math.random() * afternoonGreetings.length)];
  } else if (hour >= 17 && hour < 22) {
    const eveningGreetings = [
      {
        greeting: `Good Evening, ${userName}!`,
        subtitle: `Winding down or gearing up for evening syncs? We've got you covered.`,
        emoji: '🌆'
      },
      {
        greeting: `Hey ${userName}, evening!`,
        subtitle: `Great work today. Wrap up sessions or review your AI meeting summaries here.`,
        emoji: '✨'
      },
      {
        greeting: `Welcome back, ${userName}!`,
        subtitle: `Evening is a great time to reflect on your team's milestones.`,
        emoji: '🌙'
      }
    ];
    return eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)];
  } else {
    const nightGreetings = [
      {
        greeting: `Burning the midnight oil, ${userName}?`,
        subtitle: `Late night productivity! Remember to rest soon, but we're right here with you.`,
        emoji: '🌌'
      },
      {
        greeting: `Night owl mode, ${userName}!`,
        subtitle: `Quiet hours, high focus. Your inclusive tools are working around the clock.`,
        emoji: '🦉'
      },
      {
        greeting: `Hello, night owl ${userName}!`,
        subtitle: `Late sessions made easy with real-time translation and automated summaries.`,
        emoji: '⭐'
      }
    ];
    return nightGreetings[Math.floor(Math.random() * nightGreetings.length)];
  }
}
