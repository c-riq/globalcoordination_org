# Enable printing executed commands
set x
trap "exit" INT

# Get AWS PROFILE, S3 Bucket and CloudFront Id from environment variables  or write it down statically
aws_profile=chris-s3-deploy
s3_bucket=globalcoordination.org
cf_id=E1J4XELCO0OJJX

echo Profile: $aws_profile
echo S3_Bucket: $s3_bucket
echo CloudFront Distribution: $cf_id

if [ -z "$aws_profile" ]; then
  echo AWS_PROFILE not found
  exit
fi
if [ -z "$s3_bucket" ]; then
  echo S3_BUCKET not found
  exit
fi

#set env variable for aws cli
export AWS_PROFILE=$aws_profile

if [ ! -d "public" ]; then
    echo "${red}public folder not found${reset}"
    exit 0;
fi

echo Synching Build Folder: $s3_bucket...
aws s3 sync public/ s3://$s3_bucket --delete --cache-control max-age=31536000,public

# echo Adjusting cache...
# aws s3 cp s3://$s3_bucket/sw.js s3://$s3_bucket/sw.js --metadata-directive REPLACE --cache-control max-age=0,no-cache,no-store,must-revalidate --content-type application/javascript --acl public-read
# aws s3 cp s3://$s3_bucket/index.html s3://$s3_bucket/index.html --metadata-directive REPLACE --cache-control max-age=0,no-cache,no-store,must-revalidate --content-type text/html --acl public-read

if [ ! -z "$cf_id" ]; then
    echo Invalidating cloudfront cache
    aws cloudfront create-invalidation --distribution-id $cf_id --paths "/*"
fi
