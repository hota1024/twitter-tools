/**
 * Component interface.
 */
export interface Component {
  /**
   * install component.
   */
  install(): void | Promise<void>

  /**
   * start component.
   */
  start(): void | Promise<void>
}
