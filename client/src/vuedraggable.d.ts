declare module 'vuedraggable' {
  import { DefineComponent } from 'vue';

  interface DraggableProps {
    modelValue?: any[];
    list?: any[];
    itemKey?: string;
    group?: any;
    handle?: string;
    animation?: number;
    ghostClass?: string;
    dragClass?: string;
    disabled?: boolean;
    tag?: string;
    componentData?: any;
  }

  interface DraggableSlots {
    item: (props: { element: any; index: number }) => any;
    header: () => any;
    footer: () => any;
  }

  const draggable: DefineComponent<DraggableProps, {}, {}, {}, {}, {}, {}, DraggableSlots>;
  export default draggable;
}
