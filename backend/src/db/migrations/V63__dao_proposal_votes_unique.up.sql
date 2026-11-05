DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dao_votes_proposal_id_voter_key'
  ) THEN
    ALTER TABLE dao_votes ADD CONSTRAINT dao_votes_proposal_id_voter_key UNIQUE (proposal_id, voter);
  END IF;
END $$;
