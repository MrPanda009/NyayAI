import AnimatedAuth from '../../../components/auth/AnimatedAuth';

export default function LoginPage() {
  return (
    <main className="min-h-screen">
      <AnimatedAuth 
        leftPanelTitle="JOIN NyayAI!"
        leftPanelSubtitle="Create an account to access the legal command center and start your journey with us."
        rightPanelTitle="WELCOME TO NyayAI!"
        rightPanelSubtitle="Log in to your digital command center. Manage cases, assign tasks, and track real-time progress."
        themeColor="#997953"
        themeColorDark="#cdaa80"
        backgroundColor="#F5F0E8"
        backgroundColorDark="#0f1e3f"
        textColor="#443831"
        textColorDark="#E8E2D6"
        backdrop="#efe6d8"
        backdropDark="#0a152e"
        leftPanelImage="/Background_light.png"
        rightPanelImage="/Background_light.png"
      />
    </main>
  );
}
