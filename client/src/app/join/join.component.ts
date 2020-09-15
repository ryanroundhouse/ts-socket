import { Component, OnInit } from '@angular/core';
import { LobbyService } from '../services/lobby.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'liar-join',
  templateUrl: './join.component.html',
  styleUrls: ['./join.component.scss']
})
export class JoinComponent implements OnInit {
  gameId: string;
  errorMessage: string;

  constructor(private lobbyService: LobbyService, private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.gameId = this.route.snapshot.params['gameId'];
    this.lobbyService.login().subscribe(next => {
      console.log(`login result: ${JSON.stringify(next)}`);
      this.lobbyService.joinGame(this.gameId, 'tiny').subscribe(next => {
        console.log(`join game result: ${JSON.stringify(next)}`);
        this.router.navigate(['/lobby', this.gameId]);
      },
      error => {
        console.error(`got a join game error: ${error.error.message}`);
        this.errorMessage = "either game doesn't exist or you just can't join it.";
      });
    }, 
    error => {
      console.log(`got a login error: ${error.error.message}`);
      this.errorMessage = "error encountered authorizing player.";
    });
  }

}