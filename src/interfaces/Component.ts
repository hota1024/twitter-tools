/**
 * Component interface.
 */
export interface Component {
  /**
   * install component.
   */
  install(): void

  /**
   * start component.
   */
  start(): void
}
