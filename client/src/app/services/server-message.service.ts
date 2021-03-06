import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { GameMessage } from '@ryanroundhouse/liars-dice-interface';
import { environment } from 'src/environments/environment';
import { WebsocketService } from './websocket.service';

const WS_URL = `${environment.ws}://${environment.domainNameAndPort}`;

@Injectable({
  providedIn: 'root',
})
export class ServerMessageService {
  private subject: Subject<GameMessage>;

  constructor(private wsService: WebsocketService) {}

  disconnect() {
    this.wsService.disconnect();
    if (this.subject && !this.subject.closed) {
      this.subject.unsubscribe();
    }
  }

  connect(): Subject<GameMessage> {
    if (!this.subject || this.subject.closed) {
      this.subject = this.create();
      console.log('Successfully connected game messages.');
    }
    return this.subject;
  }

  create(): Subject<GameMessage> {
    this.subject = new Subject<GameMessage>();
    this.wsService.connect(WS_URL).subscribe(
      (nextMessageEvent: MessageEvent) => {
        console.log(nextMessageEvent);
        const data = JSON.parse(nextMessageEvent.data);
        const result: GameMessage = {
          messageType: data.messageType,
          message: data.message,
        };
        this.subject.next(result);
      },
      (errorMessageEvent) => {
        console.error(errorMessageEvent);
      },
    );

    return this.subject;
  }
}
