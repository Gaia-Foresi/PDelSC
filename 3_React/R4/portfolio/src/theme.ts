type Theme = 'light' | 'dark';

class ThemeManager {
  private currentTheme: Theme;

  constructor() {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem('theme');
    } catch {}
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    this.currentTheme = stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light';
    this.applyTheme(this.currentTheme, false);
  }

  private applyTheme(theme: Theme, save = true): void {
    document.documentElement.setAttribute('data-theme', theme);
    if (save) {
      try {
        localStorage.setItem('theme', theme);
      } catch {}
    }
    this.currentTheme = theme;
  }

  public toggleTheme(): void {
    this.applyTheme(this.currentTheme === 'light' ? 'dark' : 'light');
  }

  public getTheme(): Theme {
    return this.currentTheme;
  }
}

export const themeManager = new ThemeManager();
