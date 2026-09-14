class ThemeManager {
  private currentTheme: 'light' | 'dark';

  constructor() {
    const storedTheme = localStorage.getItem('theme');
    this.currentTheme = storedTheme === 'dark' ? 'dark' : 'light';
    this.applyTheme(this.currentTheme);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    this.currentTheme = theme;
  }

  public toggleTheme(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
  }

  public getTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }
}

export const themeManager = new ThemeManager();
