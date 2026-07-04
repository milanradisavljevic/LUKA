import sourceMaterialLineart from '../../assets/start-actions/source-material-lineart.png';
import competencyLineart from '../../assets/start-actions/competency-lineart.png';
import quickExerciseLineart from '../../assets/start-actions/quick-exercise-lineart.png';

type StartActionVariant = 'quelltext' | 'kompetenz' | 'schnell';

interface StartActionIllustrationProps {
  variant: StartActionVariant;
}

const ILLUSTRATIONS: Record<StartActionVariant, string> = {
  quelltext: sourceMaterialLineart,
  kompetenz: competencyLineart,
  schnell: quickExerciseLineart,
};

export function StartActionIllustration({ variant }: StartActionIllustrationProps) {
  return (
    <figure
      className={`start-action-illustration start-action-illustration--${variant}`}
      aria-hidden="true"
    >
      <img
        className="start-action-illustration__asset"
        src={ILLUSTRATIONS[variant]}
        alt=""
        draggable={false}
      />
    </figure>
  );
}
