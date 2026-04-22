/// <reference types="vite/client" />
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

// Declare Ionic web component custom elements for use as JSX intrinsics
declare namespace JSX {
  interface IntrinsicElements {
    'ion-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      name?: string;
      src?: string;
      icon?: string;
      size?: 'small' | 'large';
      color?: string;
      class?: string;
    };
  }
}
