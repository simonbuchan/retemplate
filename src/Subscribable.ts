export interface AnonymousSubscription {
  unsubscribe(): void;
}

export interface Observer<T> {
  next(value: T): void;
  error(error: any): void;
  complete(): void;
}

export interface Subscribable<T> {
  // subscribe(
  //   observer?: Partial<Observer<T>>,
  //   error?: (error: any) => void,
  //   complete?: () => void,
  // ): AnonymousSubscription;
  // subscribe(
  //   next?: (value: T) => void,
  //   error?: (error: any) => void,
  //   complete?: () => void,
  // ): AnonymousSubscription;
  subscribe(
    observerOrNext?: Partial<Observer<T>> | ((value: T) => void),
    error?: (error: any) => void,
    complete?: () => void,
  ): AnonymousSubscription;
}
