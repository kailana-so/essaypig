import { Resend } from 'resend';
import { MONTHLY } from '../utils/constants';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const resend = new Resend(process.env.RESEND_API_KEY);

export const reminderEmail = async (to: string, group: string) => {

  const schedule = group === MONTHLY 
  ? '<a href="https://meet.google.com/vzj-jvsr-ybo">Click here to join the call...</a>.' 
  : '<a href="https://meet.google.com/ead-jgpg-uyd">Click here to join...</a> or meet at the pub?';

  const subject = group === MONTHLY 
  ? `Book club starts at 7:30`
  : `It's book club pub time!`;

  await resend.emails.send({
    from: 'oink@essaypig.com',
    to,
    subject: `🐷📚 ${subject}`,
    html: `
      <div style="padding: 0 0 1rem 0; font-family: monospace, 'Inconsolata', sans-serif; font-size: 14px; color: #333;">
        <div style="text-align: left; margin-bottom: 1rem;">
          <img src="https://essaypig.com/essay-pig.png" alt="Essay Pig logo" style="height: 40px; width: auto; display: block;" />
        </div>
        <br />
        <br />
        <div style="text-align: left; margin: 1rem 0;">
          <p>Afternoon ${group} piggy, </p>
          <p>
            ${schedule}
          </p>
        </div>

        <div style="margin-top: 2rem; text-align: center;">
          <pre style="font-family: monospace; font-size: 9px; line-height: 1.2; color: #555;">
███████╗███████╗███████╗ █████╗ ██╗   ██╗    ██████╗ ██╗ ██████╗ 
██╔════╝██╔════╝██╔════╝██╔══██╗╚██╗ ██╔╝    ██╔══██╗██║██╔════╝ 
█████╗  ███████╗███████╗███████║ ╚████╔╝     ██████╔╝██║██║  ███╗
██╔══╝  ╚════██║╚════██║██╔══██║  ╚██╔╝      ██╔═══╝ ██║██║   ██║
███████╗███████║███████║██║  ██║   ██║       ██║     ██║╚██████╔╝
╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝       ╚═╝     ╚═╝ ╚═════╝
          </pre>
        </div>
      </div>
    `,
  });
};
