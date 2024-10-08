<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton';

    export let data
</script>


<div class="max-w-xl mx-auto pb-4">
    <div class="relative">
        <img src={data.user.banner} alt={data.user.displayName} class="w-full h-40">
        <div class="absolute -bottom-10 left-4">
            <Avatar src={data.user.avatar} width="w-24" rounded="rounded-full" initials={data.user.displayName?.slice(0,2)} border="border-4 border-surface-300-600-token" />
        </div>
    </div>
    <div class="mt-12 px-4">
        <h3 class="text-xl font-bold">{data.user.displayName}</h3>
        <h4 class="opacity-70">{data.user.handle}</h4>
        <div class="flex gap-4 flex-wrap">
           <div> 
            <span class="font-bold">{data.user.followersCount}{" "} </span><span class="opacity-60">followers</span>
        </div>
           <div> 
            <span class="font-bold">{data.user.followsCount}{" "} </span><span class="opacity-60">followings</span>
        </div>
          <div>
            <span class="font-bold">{data.user.postsCount} {" "}</span><span class="opacity-60">posts</span>
        </div>
        </div>
        <p class="mt-3">{data.user.description}</p>
    </div>
</div>
